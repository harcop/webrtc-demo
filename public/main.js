const divSelectRoom = document.getElementById('selectRoom');
const divConsultingRoom = document.getElementById('consultingRoom');
const inputRoomNumber = document.getElementById('roomNumber');
const btnGoRoom = document.getElementById('goRoom');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const h2CallName = document.getElementById("callName");
const inputCallName = document.getElementById("inputCallName");
const btnSetName = document.getElementById("setName");


let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller, dataChannel;

const iceServers = {
    iceServer: [
        {urls: 'stun:stun.services.mozilla.com'},
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

const streamConstraints = {
    audio: true,
    video: true
};

const socket = io();

btnGoRoom.onclick = () => {
    if (inputRoomNumber.value === '') {
        alert('please enter a room name');
    } else {
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);
        divSelectRoom.style = "display: none";
        divConsultingRoom.style = "display: block"
    }
}

btnSetName.onclick = () => {
    if (inputCallName.value === '') {
        alert('please enter a call name');
    } else {
        console.log(dataChannel, "channel here shoni cc")
        dataChannel.send(inputCallName.value);
        h2CallName.innerText = inputCallName.value;
    }
}

socket.on('created', room => {
    navigator.mediaDevices.getUserMedia(streamConstraints)
    .then(stream => {
        console.log('am streaming', stream);
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
    })
    .catch(error => {
        console.log('an error occurred')
    })
})
socket.on('joined', room => {
    navigator.mediaDevices.getUserMedia(streamConstraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', roomNumber);
    })
    .catch(error => {
        console.log('an error occurred')
    })
})

socket.on('ready', () => {
    if (isCaller) {
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log('error here');
            })
        dataChannel = rtcPeerConnection.createDataChannel(roomNumber);
        dataChannel.onmessage = event => {
            console.log(event.data, "rollercoaster");
            h2CallName.innerText = event.data
        }
    }
})

socket.on('offer', (event) => {
    if (!isCaller) {
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log('error here');
            })
        rtcPeerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            dataChannel.onmessage = event => {
                h2CallName.innerText = event.data
            }
        }
    }
})

socket.on('answer', (event) => {
    console.log('answered done');
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

socket.on('candidate', event => {
    console.log('am her for Ice', event);
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
})

function onAddStream(event) {
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.streams[0];
}

function onIceCandidate(event) {
    if(event.candidate) {
        console.log('sending ice candidate', event.candidate);
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}