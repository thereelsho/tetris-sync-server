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

// Broadcast helper
function broadcast(data, isRaw = false) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (isRaw) {
        client.send(data.toString());  // ✅ raw string for SL
      } else {
        client.send(JSON.stringify(data)); // ✅ JSON for browsers
      }
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  // Always greet browser clients with JSON
  ws.send(JSON.stringify({ type: "welcome", message: "Connected to server" }));

  ws.on("message", (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      // If not JSON, treat it as raw (from SL)
      console.log("⚠️ Non-JSON message (likely SL):", message.toString());
      broadcast(message, true); // send back as raw string
      return;
    }

    // If valid JSON, rebroadcast as JSON
    broadcast({
      type: "broadcast",
      from: "server",
      data: parsed,
      timestamp: Date.now(),
    });
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
