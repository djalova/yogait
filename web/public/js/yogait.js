import { motivationalLines } from './motivation-lines.js';

/**
 * Contains the state transition logic and timing information.
 */
class Yogait {
    constructor() {
        this.startTime = 0;
        this.prompt = null;
        this.poseNames = ['y', 'lunge', 'warrior'];
        this.targetPose = this.poseNames[0];
        this.posing = false;
        this.confidenceThreshold = 90;
        this.timerLength = 10;
        this.generatePrompt();
    }

    // Generates prompt from random combination of motivational lines and poses
    generatePrompt() {
        var rand = Math.floor(Math.random() * (motivationalLines.length));
        String.prototype.format = function () {
            var a = this;
            for (var k in arguments) {
                a = a.replace("{" + k + "}", arguments[k]);
            }
            return a;
        };
        this.prompt = motivationalLines[rand].format(this.targetPose);
    }

    // Starts the internal timer for pose
    clickTimer() {
        this.startTime = Date.now();
    }

    // Checks if the pose identified matches the target pose
    checkPose(posePrediction, poseConfidence) {
        return posePrediction === this.targetPose && poseConfidence > this.confidenceThreshold;
    }

    // Changes target pose
    changePose() {
        this.targetPose = this.poseNames[(this.poseNames.indexOf(this.targetPose) + 1) % this.poseNames.length];
        this.clickTimer();
        this.generatePrompt();
        this.posing = false;
    }

    processPose(pose) {
        let playerPose = pose[0];
        let currentPrediction = playerPose[1];
        let currentConfidence = playerPose[2];

        // logic for state transitions
        if (this.checkPose(currentPrediction, currentConfidence)) {
            if (this.posing) {
                let poseTime = Date.now() - yogaSession.startTime
                textPrompt.innerHTML.concat(`: ${poseTime * 1000} seconds`)
                if (poseTime > timerLength * 1000) {
                    this.changePose()
                    // display congratulatory message
                    // setTimeout(function() {
                    //     this.textCanvas.getContext('2d').clearRect(0, 0, wrapper.textCanvas.width, wrapper.textCanvas.height);
                    //     this.textCanvas.getContext('2d').fillText('Great job :)', wrapper.textCanvas.width / 2, wrapper.textCanvas.height / 2);
                    // }, 2000);                
                }
            } else {
                this.clickTimer();
                this.posing = true;
                console.log('\tPosing!');
            }
        } else {
            this.posing = false;
            this.clickTimer();
        }
    }
}

export {Yogait}