const express = require('express');
const socketIO = require('socket.io');
const https = require('https');
const fs = require('fs');

const roomName = 'Webrtc'

const app = express();

const server = https.createServer({
  key: fs.readFileSync('./certs/example.key'),
  cert: fs.readFileSync('./certs/example.crt')
}, app);


app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
  console.log('here');
  res.sendFile(__dirname + '/public/index.html');
})

const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('message', (data) => {
    console.log(`Message: ${JSON.stringify(data)} ${socket.id}`);

    if(data.action === 'register') {
      socket.join(roomName);
    }

    if(data.action === 'sdpOffer') {
      socket.to(roomName).emit('message', { action: 'sdpOffer', offer: data.offer})
    }

    if(data.action === 'iceCandidate') {
      socket.to(roomName).emit('message', { action: 'iceCandidate', candidate: data.candidate})
    }

    if(data.action === 'sdpAnswer') {
      socket.to(roomName).emit('message', { action: 'sdpAnswer', answer: data.answer})
    }

  })

  socket.on('disconnect', () => {
    console.log('disconnected', socket.id);
    socket.leave(roomName)
  })
})


server.listen(3000, () => {
  console.log('listening on 3000');
});
