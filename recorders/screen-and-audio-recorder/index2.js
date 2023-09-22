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
    audio: true,
};

const audioMediaStreamConstraints = {
    video: false,
    audio: true,
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
                // 1. Display video feedback:
                startVideoFeedback();

                // 2. Recording:
                startButton.disabled = true;
                stopButton.disabled = false;

                // 2.1. Combine audio from Microphone and System audio:
                const composedMediaStream = new MediaStream(); // Used to combine Screen recording video and audio (Microphone and System audio) together.
                const audioContext = new AudioContext();
                const audioDestinationNode = audioContext.createMediaStreamDestination();
                // - Screen recording video from mediaStream:
                mediaStream.getVideoTracks().forEach((videoTrack) => {
                    composedMediaStream.addTrack(videoTrack);
                });
                // - System audio from mediaStream:
                if (mediaStream.getAudioTracks().length > 0) {
                    const systemAudioSource = audioContext.createMediaStreamSource(mediaStream);
                    // Set up its volume:
                    const systemAudioGain = audioContext.createGain();
                    systemAudioGain.gain.value = 1.0;
                    // Add it to the destination:
                    systemAudioSource.connect(systemAudioGain).connect(audioDestinationNode);
                }
                // - Microphone from audioMediaStream:
                if (audioMediaStream.getAudioTracks().length > 0) {
                    const micSource = audioContext.createMediaStreamSource(audioMediaStream);
                    // Set up its volume:
                    const micGain = audioContext.createGain();
                    micGain.gain.value = 1.0;
                    // Add it to the destination:
                    micSource.connect(micGain).connect(audioDestinationNode);
                }
                // - Add the combine of Microphone and System audio:
                audioDestinationNode.stream.getAudioTracks().forEach((audioTrack) => {
                    composedMediaStream.addTrack(audioTrack);
                });

                // 2.2. Start recording:
                // mixedMediaStream = composedMediaStream;
                mixedMediaStream = composedMediaStream;
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