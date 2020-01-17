const lineWidth = 2;
const pointRadius = 4;

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
        drawLine(ctx, ...l, color, scale[0], scale[1])
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
        if (!partsToDraw || partsToDraw.includes(p['partName'])) {
            let color = `rgb(${colors[p['partId']]})`
            drawPoint(ctx, p['x'], p['y'], color, scale[0], scale[1])
        }
    })
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

export {drawPoseLines, drawBodyParts}