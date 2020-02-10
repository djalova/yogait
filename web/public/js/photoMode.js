class PhotoMode {

    constructor() {
        this.takePhoto = this.takePhoto.bind(this);
        this.retakePhoto = this.retakePhoto.bind(this);
        this.cleanUp = this.cleanUp.bind(this);

        // Create buttons to include
        this.photoButton = document.getElementById("photoButton");
        this.photoButton.addEventListener("click", this.takePhoto);

        this.confirmationButton = document.createElement("BUTTON");
        this.confirmationButton.classList.add("btn", "btn-large");
        this.confirmationButton.textContent = "Keep Photo";
        this.confirmationButton.addEventListener("click", this.confirmPhoto);

        this.retryButton = document.createElement("BUTTON");
        this.retryButton.classList.add("btn", "btn-large");
        this.retryButton.textContent= "Retry Photo";
        this.retryButton.addEventListener("click", this.retakePhoto);
    }

    startMode() {
        // Add relevant buttons
    }

    /**
     * Pauses webcam stream
     */
    takePhoto() {
        document.querySelector("video").pause();

        this.clearDiv();
        document.getElementById("photoMode").appendChild(this.confirmationButton);
        document.getElementById("photoMode").appendChild(this.retryButton);
    }

    /**
     * Renables webcam stream
     */
    retakePhoto() {
        document.querySelector("video").play();
        this.clearDiv();
        document.getElementById("photoMode").appendChild(this.photoButton);
    }

    /**
     * Helper function that clears the div containing photo mode's buttons
     */
    clearDiv() {
        let buttonDiv = document.getElementById("photoMode");
        while (buttonDiv.firstChild) {buttonDiv.removeChild(buttonDiv.firstChild)};
    }

    confirmPhoto() {
        let poseName = window.prompt("Name this pose");
        let canvas = document.querySelector("canvas");
        const promiseBlob = () => {
            return new Promise((resolve, reject) => {
                canvas.toBlob(resolve, 'image/jpg', 1.0);
            });
        };

        let endpoint = `/pose/${poseName}`

        return promiseBlob().then((blob) => {
            console.log(blob);
            return fetch(endpoint,
                {
                    method: 'POST',
                    body: blob,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            )
        })
    }


    /**
     * Remove photo mode related elements
     */
    cleanUp() {
        this.clearDiv();
    }

}

export { PhotoMode }