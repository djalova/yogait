import { cocoColors, cocoParts } from './coco-common.js'
import { motivationalLines } from './motivation-lines.js'
const lineWidth = 2;
const pointRadius = 4;
const timerLength = 10;

var initialized = false;
var canvas;
var yogaSession;
var poseCanvas;
var textPrompt;

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
        this.poseNames = ['y','lunge','warrior']
        this.currentPose = this.poseNames[0];
        this.posing = false;
        this.confidenceThreshold = 90;

        this.generatePrompt()
    }

    generatePrompt() {
        var rand = Math.floor(Math.random() * (motivationalLines.length));
        String.prototype.format = function() {
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
        this.currentPose = this.poseNames[(this.poseNames.indexOf(this.currentPose)+1) % this.poseNames.length];
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
    let predictionResults = await sendImage(canvas);
    // let predictionResults = await poseEstimator.predict(canvas);

    textPrompt.innerHTML = yogaSession.prompt;

    if (predictionResults) {
        console.log(predictionResults)
        let pose = predictionResults[0];
        let currentPrediction = predictionResults[1];
        let currentConfidence = predictionResults[2];

        // draw all poses
        poseCanvas.getContext('2d').clearRect(0, 0, overlaySize.width, overlaySize.height)
        pose['predictions'].forEach((pose_prediction) => {
            drawBodyParts(poseCanvas.getContext('2d'), pose_prediction['body_parts'], cocoParts, cocoColors)
            drawPoseLines(poseCanvas.getContext('2d'), pose_prediction['pose_lines'], cocoColors)
        })
    
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
        console.log('No pose detected');
    }
    console.log(`Elapsed Time: ${dt}`);
}


/**
 * Draws the specified pose on the pose canvas.
 * @param {Canvas} canvas       Canvas on which to draw the pose.
 * @param {String} pose_name    Name of the file to be drawn.
 */

async function displayPose(canvas, pose_name) {
    const start = (new Date()).getTime();
    drawing = new Image();
    drawing.src = "images/"+pose_name+".png";
    drawing.onload = function() {
        canvas.getContext('2d').drawImage(drawing,
            canvas.width / 2 - drawing.width * 0.8 / 2, canvas.height / 2 - drawing.height * 0.8 / 2,
            drawing.width * 0.8, drawing.height * 0.8);
    };
}


/**
 *  Sends an image to the MAX server and receive a prediction in response
 */
function sendImage(canvas) {
    // get the image from the canvas
    var endpoint = 'http://localhost:5000/model/predict';
    var coordinates = new Array();

    return new Promise(function (resolve, reject) {
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('type', 'image/jpeg');

            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            var posePred = await res.json();

            if (typeof posePred['predictions'][0] === 'undefined') {
                reject('posePred undefined!')
            } else {
                // send coordinates to the svm service
                coordinates = posePred['predictions'][0]['body_parts']
                const formData = new FormData();
                formData.append('file', JSON.stringify(coordinates));
                formData.append('type', 'application/json');

                const res = await fetch('/svm', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                var result = await res.text();

                var values = result.split(',');
                var pose = values[0];
                var confidence = values[1];
                resolve([posePred, pose, parseFloat(confidence)])
            }
        }, 'image/jpeg', 1.0);
    }).catch(function (error) {
        console.log(error);
    });
}


/**
 * draw point on given canvas
 *
 * @param {CanvasRenderingContext2D} canvasCtx - the canvas rendering context to draw point
 * @param {Integer} x - the horizontal value of point
 * @param {Integer} y - the vertical value of point
 * @param {String} c - the color value for point
 */
function drawPoint(canvasCtx, x, y, c = 'black', sx = 1, sy = 1) {
    canvasCtx.beginPath()
    canvasCtx.arc(x * sx, y * sy, pointRadius, 0, 2 * Math.PI)
    canvasCtx.fillStyle = c
    canvasCtx.fill()
}

/**
 * Draws a line on a canvas
 *
 * @param {CanvasRenderingContext2D} canvasCtx - the canvas rendering context to draw point
 * @param {Integer} x1 - the horizontal value of first point
 * @param {Integer} y1 - the vertical value of first point
 * @param {Integer} x2 - the horizontal value of first point
 * @param {Integer} y2 - the vertical value of first point
 * @param {String} c - the color value for line
 */
function drawLine(canvasCtx, x1, y1, x2, y2, c = 'black', sx = 1, sy = 1) {
    canvasCtx.beginPath()
    canvasCtx.moveTo(x1 * sx, y1 * sy)
    canvasCtx.lineTo(x2 * sx, y2 * sy)
    canvasCtx.lineWidth = lineWidth
    canvasCtx.strokeStyle = c
    canvasCtx.stroke()
}

/**
 * Draws the pose lines (i.e., skeleton)
 *
 * @param {CanvasRenderingContext2D} ctx - the canvas rendering context to draw pose lines
 * @param {Array} poseLines - array of coordinates corresponding to the pose lines
 * @param {Array} colors - array of RGB values of colors to use for drawing pose lines
 */
function drawPoseLines(ctx, poseLines, colors, scale = [1, 1]) {
    poseLines.forEach((l, j) => {
        var data = JSON.stringify(Object.values(l));
        data = data.replace('[[','');
        data = data.replace(']]','');
        var lines = data.split(',');
        let color = `rgb(${colors[j].join()})`
        drawLine(ctx, lines[0], lines[1], lines[2], lines[3], color, scale[0], scale[1])
    })
}

/**
 * Draws the left and right wrists keypoints
 *
 * @param {CanvasRenderingContext2D} ctx - the canvas rendering context to draw pose lines
 * @param {Array} bodyParts - array of objects containing body part info
 * @param {Array} partsToDraw - array of the body parts to draw
 * @param {Array} colors - array of RGB values of colors to use for drawing pose lines
 */
function drawBodyParts(ctx, bodyParts, partsToDraw, colors, scale = [1, 1]) {
    bodyParts.forEach(p => {
        if (!partsToDraw || partsToDraw.includes(p['part_name'])) {
            let color = `rgb(${colors[p['part_id']]})`
            drawPoint(ctx, p['x'], p['y'], color, scale[0], scale[1])
        }
    })
}