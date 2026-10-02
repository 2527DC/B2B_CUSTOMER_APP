// Reloads every app connected to the running Metro server (simulator or phone), the same as
// pressing "r" in the `npm run dev` terminal. Usage: npm run reload [-- <port>]
const WebSocket = require('ws');

const port = process.argv[2] || process.env.RCT_METRO_PORT || '8081';
const socket = new WebSocket(`ws://localhost:${port}/message`);

socket.on('open', () => {
  socket.send(JSON.stringify({ version: 2, method: 'reload' }), () => {
    console.log(`Reload sent to apps connected to Metro on port ${port}.`);
    socket.close();
  });
});

socket.on('error', () => {
  console.error(`Metro is not running on port ${port}. Start it with "npm run dev" first.`);
  process.exit(1);
});
