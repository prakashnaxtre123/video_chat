const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let roomId;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// DOM elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join');
const roomInput = document.getElementById('room-id');
const roomDisplay = document.getElementById('room-id-display');
const toggleVideoBtn = document.getElementById('toggle-video');
const toggleAudioBtn = document.getElementById('toggle-audio');

// Initially disable media controls until stream is ready
toggleVideoBtn.disabled = true;
toggleAudioBtn.disabled = true;

async function setupMediaStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        
        // Enable controls once stream is ready
        toggleVideoBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        
        return true;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera and microphone. Please ensure they are connected and permissions are granted.');
        return false;
    }
}

function createPeerConnection() {
    if (!localStream) {
        console.error('Local stream not available');
        return false;
    }

    try {
        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
            remoteStream = event.streams[0];
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };

        return true;
    } catch (error) {
        console.error('Error creating peer connection:', error);
        return false;
    }
}

createRoomBtn.addEventListener('click', async () => {
    if (await setupMediaStream()) {
        roomId = Math.random().toString(36).substring(7);
        roomDisplay.textContent = `Room ID: ${roomId}`;
        socket.emit('join-room', roomId);
        createPeerConnection();
    }
});

joinRoomBtn.addEventListener('click', async () => {
    roomId = roomInput.value;
    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }
    
    if (await setupMediaStream()) {
        socket.emit('join-room', roomId);
        if (createPeerConnection()) {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', offer);
            } catch (error) {
                console.error('Error creating offer:', error);
                alert('Failed to create connection offer. Please try again.');
            }
        }
    }
});

socket.on('offer', async (offer) => {
    if (!peerConnection && localStream) {
        createPeerConnection();
    }
    
    if (peerConnection) {
        try {
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', answer);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }
});

socket.on('answer', async (answer) => {
    if (peerConnection) {
        try {
            await peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error adding ice candidate:', error);
        }
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideoBtn.textContent = videoTrack.enabled ? 'Toggle Video' : 'Enable Video';
    }
});

toggleAudioBtn.addEventListener('click', () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleAudioBtn.textContent = audioTrack.enabled ? 'Toggle Audio' : 'Enable Audio';
    }
});