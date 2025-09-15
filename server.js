const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();

// ✅ Serve static files (index.html, version.json, etc.) from repo root
app.use(express.static(path.join(__dirname)));

// Default route -> serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Helper: safe broadcast to all clients
function broadcastJSON(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  // Send welcome message
  ws.send(JSON.stringify({ type: "welcome", message: "Connected to server" }));

  ws.on("message", (message) => {
    let parsed;

    try {
      // Client should send JSON strings
      parsed = JSON.parse(message);
    } catch (err) {
      console.warn("⚠️ Received non-JSON message, wrapping:", message.toString());
      parsed = { type: "raw", data: message.toString() };
    }

    // Echo back to all clients as JSON
    broadcastJSON({
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
