const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ store latest broadcast for SL prims
let latestState = { type: "init", data: "no state yet", timestamp: Date.now() };

// Broadcast helper
function broadcast(data, isRaw = false) {
  if (!isRaw) latestState = data; // save last JSON state
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(isRaw ? data.toString() : JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Browser client connected");

  ws.send(JSON.stringify({ type: "welcome", message: "Connected to server" }));

  ws.on("message", (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message); // browsers send JSON
    } catch {
      parsed = { type: "raw", data: message.toString() };
      broadcast(parsed, true); // rebroadcast raw
      return;
    }

    const broadcastData = {
      type: "broadcast",
      data: parsed,
      timestamp: Date.now(),
    };

    broadcast(broadcastData, false);
  });

  ws.on("close", () => console.log("❌ Browser client disconnected"));
});

// ✅ REST endpoint for SL prims
app.get("/state", (req, res) => {
  res.json(latestState);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
