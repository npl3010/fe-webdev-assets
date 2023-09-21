const videoFeedback = document.getElementById('video-feedback');
const videoRecorded = document.getElementById('video-recorded');

const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const downloadButton = document.getElementById('download-button');

const videoName = document.getElementById('video-name');

let mediaStream;
let audioMediaStream;
let mixedMediaStream;
let mediaRecorder;
let chunks = [];

const displayMediaStreamOptions = {
    video: {
        displaySurface: 'monitor',
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        suppressLocalAudioPlayback: true,
    },
    surfaceSwitching: 'include',
    selfBrowserSurface: 'exclude',
    systemAudio: 'exclude',
};

const audioMediaStreamConstraints = {
    video: false,
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
    },
};

function startVideoFeedback() {
    if (mediaStream) {
        videoFeedback.srcObject = mediaStream;
        videoFeedback.play();
    } else {
        console.log('Warning: mediaStream is unavailable!');
    }
}

function stopMediaStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
    } else {
        console.log('Warning: mediaStream is unavailable!');
    }
}

function stopAudioMediaStream() {
    if (audioMediaStream) {
        audioMediaStream.getTracks().forEach((track) => track.stop());
    } else {
        console.log('Warning: audioMediaStream is unavailable!');
    }
}

function handleMediaRecorderDataAvailable(e) {
    chunks.push(e.data);
}

function handleMediaRecorderStop(e) {
    const blob = new Blob(chunks, {
        type: 'video/mp4'
    });
    chunks = [];

    // Info:
    const mediaName = `screen-recorder-result-${Math.round(Math.random() * 100000)}.mp4`;
    videoName.innerHTML = mediaName;

    // Download:
    downloadButton.href = URL.createObjectURL(blob);
    downloadButton.download = mediaName;

    // Preview:
    videoRecorded.src = URL.createObjectURL(blob);
    videoRecorded.load();
    videoRecorded.onloadeddata = () => {
        videoRecorded.play();
    };

    // Clean up and reset:
    stopMediaStream();
    stopAudioMediaStream();
    startButton.disabled = false;
    stopButton.disabled = true;

    console.log('Recording has been stopped!');
}

function handleAfterStopSharingScreen() {
    if (audioMediaStream) {
        mediaStream.getTracks().forEach((track) => {
            track.removeEventListener("ended", handleAfterStopSharingScreen);
        });
        audioMediaStream.getAudioTracks().forEach((track) => track.stop());
        mediaRecorder.stop();
    } else {
        console.log('Warning: audioMediaStream is unavailable!');
    }
}

async function startCapture() {
    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaStreamOptions);
        audioMediaStream = await navigator.mediaDevices.getUserMedia(audioMediaStreamConstraints);

        if (mediaStream instanceof MediaStream && audioMediaStream instanceof MediaStream) {
            // Check if the selected displaySurface is 'monitor' or not:
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack.getSettings().displaySurface === 'monitor') {
                // Display video feedback:
                startVideoFeedback();

                // Recording:
                startButton.disabled = true;
                stopButton.disabled = false;

                mixedMediaStream = new MediaStream([
                    ...mediaStream.getTracks(),
                    ...audioMediaStream.getTracks(),
                ]);
                mediaRecorder = new MediaRecorder(mixedMediaStream);
                mediaRecorder.ondataavailable = handleMediaRecorderDataAvailable;
                mediaRecorder.onstop = handleMediaRecorderStop;
                mediaRecorder.start();
                mediaStream.getTracks().forEach((track) => {
                    track.addEventListener("ended", handleAfterStopSharingScreen);
                });

                console.log('Recording has been started...');
            } else {
                stopMediaStream();
                stopAudioMediaStream();
                console.log('Warning: displaySurface must be \'monitor\'!');
            }
        } else {
            console.log('Warning: mediaStream or audioMediaStream is unavailable!');
        }
    } catch (err) {
        console.error(err);
    }
}

function handleStartRecording() {
    startCapture();
}

function handleStopRecording() {
    mediaRecorder.stop();
}

window.addEventListener('load', () => {
    startButton.disabled = false;
    stopButton.disabled = true;
});

startButton.addEventListener('click', handleStartRecording);
stopButton.addEventListener('click', handleStopRecording);