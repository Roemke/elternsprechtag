const { Server } = require('socket.io')

let io

function initSocket(server) {
  io = new Server(server)
  
  io.on('connection', (socket) => {
    console.log('Client verbunden:', socket.id)

    socket.on('join-event', (event_id) => {
      socket.join(`event-${event_id}`)
      console.log(`Client ${socket.id} joined event-${event_id}`)
    })

    socket.on('leave-event', (event_id) => {
      socket.leave(`event-${event_id}`)
    })

    socket.on('disconnect', () => {
      console.log('Client getrennt:', socket.id)
    })
  })

  return io
}

function getIo() {
  return io
}

module.exports = { initSocket, getIo }