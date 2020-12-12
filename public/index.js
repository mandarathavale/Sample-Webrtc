socket = io('https://192.168.43.68:3000');
let peerConnection = null;
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}

const candidateQueue = [];

function connectToServer() {
  socket.emit('message', { action: 'register'});
}

socket.on('message', async (data) => {
    if (data.action === 'sdpOffer') {
        try {
          if(!peerConnection) {
            await getMediaDevices();
          }
          await handleSdpOffer(data.offer);
          const answer = await createSdpAnswer(data.offer);
          socket.emit('message', { action: 'sdpAnswer', answer});
          console.log(peerConnection);
          await handleIceQueue();
        } catch(error) {
          console.log('HAndling sdp offer error: ', error);
        }
    }

    if(data.action === 'iceCandidate') {
        if(!peerConnection) {
          candidateQueue.push(data.candidate);
        } else {
          await peerConnection.addIceCandidate(data.candidate);
        }
    }

    if (data.action === 'sdpAnswer') {
        if(!peerConnection) {
          console.error('ERROR')
        }

        await handleSdpAnswer(data.answer);
    }
});


async function createRTCPeerConnection() {
  console.log('creating connection');
  peerConnection = new RTCPeerConnection(configuration);

  console.log('connection: ', peerConnection);
  // listener for ICE
  peerConnection.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      console.log('ICE:', event.candidate);
      socket.emit('message',{action:'iceCandidate', candidate: event.candidate});
      // signalingChannel.send({'new-ice-candidate': event.candidate});
    }
  })

  const remoteStream = new MediaStream();
  const remoteVideo = document.querySelector('#remoteVideo');
  remoteVideo.srcObject = remoteStream;

  peerConnection.addEventListener('track', async (event) => {
      remoteStream.addTrack(event.track, remoteStream);
  });
}

async function createSdpOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch(error) {
    console.error('createSdpOffer Error: ', error)
  }
}

async function createSdpAnswer() {
  try {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch(error) {
    console.error('createSdpAnswer Error: ', error)
  }
}

async function handleSdpOffer(offer) {
  const remoteDesc = new RTCSessionDescription(offer);
  await peerConnection.setRemoteDescription(remoteDesc);
}

async function handleSdpAnswer(answer) {
  const remoteDesc = new RTCSessionDescription(answer);
  await peerConnection.setRemoteDescription(remoteDesc);
}


function sendSDPOffer(offer) {
  socket.emit('message',{action:'sdpOffer', offer});
}

async function handleIceQueue() {
  candidateQueue.forEach(async (candidate) => {
      try {
        console.log('in queue', candidate);
        await peerConnection.addIceCandidate(candidate);
      } catch(error) {
        console.log('Error: ', error);
      }
  })
}

async function makeCall(localStream) {
    try {
      await createRTCPeerConnection()

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

    } catch(error) {
      console.error('makeCall Error: ', error)
    }

}

async function getMediaDevices() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    console.log('got media stream', stream);

    const videoElement = document.querySelector('video#localVideo');
    videoElement.srcObject = stream;

    await makeCall(stream);
  } catch(error) {
    console.error('getMediaDevices Error: ', error)
  }
}

async function initiateCall() {
  try {
    await getMediaDevices();
    const offer = await createSdpOffer();
    sendSDPOffer(offer);
  } catch(error) {
    console.error('InitiateCall Error: ', error)
  }
}
