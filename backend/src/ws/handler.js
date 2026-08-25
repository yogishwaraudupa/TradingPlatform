function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log('WS connected', socket.id);
    socket.on('subscribe', (symbols) => {
      console.log('subscribe', symbols);
      socket.join('prices');
    });
    socket.on('disconnect', () => console.log('WS disconnected', socket.id));
  });
}
module.exports = { setupWebSocket };
