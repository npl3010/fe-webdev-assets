const videoFeedback = document.getElementById('video-feedback');
const videoRecorded = document.getElementById('video-recorded');

const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const downloadButton = document.getElementById('download-button');

const videoName = document.getElementById('video-name');

let mediaStream;
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
        suppressLocalAudioPlayback: false,
    },
    systemAudio: 'include',
    surfaceSwitching: 'include',
    selfBrowserSurface: 'exclude',
};

function startVideoFeedback() {
    if (mediaStream) {
        videoFeedback.srcObject = mediaStream;
        videoFeedback.muted = true; // This line is very important! Use this to deal with audio echoing.
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

function handleMediaRecorderDataAvailable(e) {
    chunks.push(e.data);
}

function handleMediaRecorderStop(e) {
    const blob = new Blob(chunks, {
        type: 'video/webm'
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
    startButton.disabled = false;
    stopButton.disabled = true;

    console.log('Recording has been stopped!');
}

async function startCapture() {
    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaStreamOptions);
        if (mediaStream instanceof MediaStream) {
            // Check if the selected displaySurface is 'monitor' or not:
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack.getSettings().displaySurface === 'monitor') {
                // Display video feedback:
                startVideoFeedback();

                // Recording:
                startButton.disabled = true;
                stopButton.disabled = false;

                mediaRecorder = new MediaRecorder(mediaStream);
                mediaRecorder.ondataavailable = handleMediaRecorderDataAvailable;
                mediaRecorder.onstop = handleMediaRecorderStop;
                mediaRecorder.start();

                console.log('Recording has been started...');
            } else {
                stopMediaStream();
                console.log('Warning: displaySurface must be \'monitor\'!');
            }
        } else {
            console.log('Warning: mediaStream is unavailable!');
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