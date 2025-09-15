const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.get("/", (_req, res) => res.send("Tetris sync server running."));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let gameState = null;

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send current state to new client
  if (gameState) {
    ws.send(JSON.stringify({ type: "state", data: gameState }));
  }

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "update") {
      gameState = data.data;
      // broadcast to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "state", data: gameState }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});
