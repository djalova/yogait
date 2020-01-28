import { cocoColors, cocoParts } from './coco-common.js'
import { motivationalLines } from './motivation-lines.js'
import { drawBodyParts, drawPoseLines } from './draw-util.js'
const timerLength = 10;

var initialized = false;
var canvas;
var yogaSession;
var poseCanvas;
var textPrompt;
let estimationPromise; // We'll recycle this variable to keep track of our promise

const overlaySize = {
    width: 640,
    height: 480
}

setup();

// Run setup. Attaches a function to a button
async function setup() {
    let button = document.getElementById("webcamButton");
    button.addEventListener("click", start)
}

/**
 *  Loads the face detector model and creates canvas to display webcam and model results.
 */
function start() {
    if (initialized) {
        console.log('initialized');
        return;
    }

    // this canvas is where we send the video stream to
    canvas = document.getElementById("canvas");
    canvas.classList.toggle("hide");

    poseCanvas = document.getElementById("pose-canvas");
    poseCanvas.classList.toggle("hide");

    textPrompt = document.getElementById("prompt");
    textPrompt.classList.toggle("hide")

    let button = document.getElementById("webcamButton");
    button.classList.add("hide");

    window.ctx = canvas.getContext('2d', {
        alpha: false
    });
    // Flip the camera output
    window.ctx.translate(overlaySize.width, 0);
    window.ctx.scale(-1, 1);

    // this lets us do state transitions
    yogaSession = new YogaWrapper();

    var mycamvas = new camvas(window.ctx, processFrame);
    initialized = true;
}


/**
 * Contains the state transition logic and timing information.
 */
class YogaWrapper {

    constructor() {
        this.startTime = 0;
        this.prompt = null;
        this.poseNames = ['y', 'lunge', 'warrior']
        this.currentPose = this.poseNames[0];
        this.posing = false;
        this.confidenceThreshold = 90;
        this.generatePrompt()
    }

    generatePrompt() {
        var rand = Math.floor(Math.random() * (motivationalLines.length));
        String.prototype.format = function () {
            var a = this;
            for (var k in arguments) {
                a = a.replace("{" + k + "}", arguments[k])
            }
            return a
        }
        this.prompt = motivationalLines[rand].format(this.currentPose);
    }

    clickTimer() {
        this.startTime = Date.now();
    }

    checkPose(posePrediction, poseConfidence) {
        return posePrediction === this.currentPose && poseConfidence > this.confidenceThreshold
    }

    changePose() {
        this.currentPose = this.poseNames[(this.poseNames.indexOf(this.currentPose) + 1) % this.poseNames.length];
        this.clickTimer();
        this.generatePrompt();
        this.posing = false;
    }
}


/**
 * Runs every frame update. Grab the image from the webcam, run face detection, then crop
 * images for faces and send those images to the model.
 * @param {Object} video    Video object.
 * @param {Number} dt       Time elapsed between frames.
 */
async function processFrame(video, dt) {
    // render the video frame to the canvas element and extract RGBA pixel data
    window.ctx.drawImage(video, 0, 0);

    // We only want to run the model on the most recent frame as long as another promise is not running
    if (!estimationPromise || !estimationPromise.isPending()) {

        // Create promise to classify pose

        let poseEstimation = estimatePoseJS(canvas)
        .then((pose) => {
            if (pose['predictions'].length > 0) {
                poseCanvas.getContext('2d').clearRect(0, 0, overlaySize.width, overlaySize.height)
                pose['predictions'].forEach((pose_prediction) => {
                    drawBodyParts(poseCanvas.getContext('2d'), pose_prediction['body_parts'], cocoParts, cocoColors)
                    drawPoseLines(poseCanvas.getContext('2d'), pose_prediction['pose_lines'], cocoColors)
                })
            }
            return pose
        })
        // .then(res => res.json())
        // .then(result => {
        //     console.log(JSON.parse(result).prediction)
        // })
        estimationPromise = QuerablePromise(poseEstimation);
    }

    textPrompt.innerHTML = yogaSession.prompt;

    if (false) {
        // if (predictionResults) {
        console.log(predictionResults)
        let pose = predictionResults[0];
        let currentPrediction = predictionResults[1];
        let currentConfidence = predictionResults[2];

        // logic for state transitions
        if (yogaSession.checkPose(currentPrediction, currentConfidence)) {
            if (yogaSession.posing) {
                let poseTime = Date.now() - yogaSession.startTime
                textPrompt.innerHTML.concat(`: ${poseTime * 1000} seconds`)
                if (poseTime > timerLength * 1000) {
                    yogaSession.changePose()
                    // display congratulatory message
                    // setTimeout(function() {
                    //     this.textCanvas.getContext('2d').clearRect(0, 0, wrapper.textCanvas.width, wrapper.textCanvas.height);
                    //     this.textCanvas.getContext('2d').fillText('Great job :)', wrapper.textCanvas.width / 2, wrapper.textCanvas.height / 2);
                    // }, 2000);                
                }
            } else {
                yogaSession.clickTimer();
                yogaSession.posing = true;
                console.log('\tPosing!');
            }
        } else {
            yogaSession.posing = false;
            yogaSession.clickTimer();
        }
    } else {
        // console.log('No pose detected');
    }
    console.log(`Elapsed Time: ${dt}`);
}


/**
 * Returns a promise containing the coordinates of body parts and pose lines predicted by
 * the TFJS version of the MAX model
 * @param {*} canvas    Canvas containing image captured from the webcam
 */
function estimatePoseJS(canvas) {
    let poseEstimation = poseEstimator.predict(canvas)
    let result = {}

    return poseEstimation.then((pose) => {
        if (pose['posesDetected'].length > 0) {
            const resultWidth = pose['imageSize']['width'];
            const resultHeight = pose['imageSize']['height'];
            // TFJS model rescales image to 432px so we need to rescale to original
            let scale = [overlaySize.width / resultWidth, overlaySize.height / resultHeight]

            pose['posesDetected'].forEach(posePrediction => {
                posePrediction['body_parts'] = posePrediction['bodyParts'].map(part => {
                    let scaledPart = { part_name: part.partName, part_id: part.partId, x: part.x * scale[0], y: part.y * scale[1], score: part.score }
                    return scaledPart;
                })
                posePrediction['pose_lines'] = posePrediction['poseLines'].map(lines => {
                    let scaledLines = {line: [lines[0] * scale[0], lines[1] * scale[1], lines[2] * scale[0], lines[3] * scale[1]]}
                    return scaledLines
                })
                delete posePrediction['bodyParts'];
                delete posePrediction['poseLines'];
            })
        }
        // TFJS model returns extra info we don't need
        result["predictions"] = pose["posesDetected"];
        return result;
    })
}


/**
 * Returns a promise containing the coordinates of body parts and pose lines predicted by
 * the Python version of the MAX model
 * @param {*} canvas    Canvas containing image captured from the webcam
 */
function estimatePose(canvas) {
    const promiseBlob = () => {
        return new Promise((resolve, reject) => {
            canvas.toBlob(resolve, 'image/jpg', 1.0);
        });
    };

    const endpoint = 'http://localhost:5000/model/predict';

    return promiseBlob().then((blob) => {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('type', 'image/jpeg');
        return fetch(endpoint,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }
        )
    })
    .then((posePred) => posePred.json())
}


/**
 * Sends a request to run the SVM to classify a given pose
 * @param {*} pose      Object containing the user's pose information
 */
function classifyPose(pose) {
    console.log(pose)
    if (pose['predictions'].length > 0) {
        let coordinates = pose['predictions'][0]['body_parts']
        const formData = new FormData();
        formData.append('file', JSON.stringify(coordinates));
        formData.append('type', 'application/json');
        return fetch('/svm', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
    } else {
        throw new Error('No pose detected');
    }
}


/**
 * Wrapper for a Promise that adds functionality to check
 * current status of a promise.
 */
function QuerablePromise(promise) {

    var isPending = true;
    var result = promise.then(
        () => { isPending = false }
    ).catch(
        () => { isPending = false }
    )
    result.isPending = function () { return isPending }
    return result;
}