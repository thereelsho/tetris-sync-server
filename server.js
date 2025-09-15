const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { createCanvas } = require("canvas");
const fs = require("fs");

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
  if (!isRaw) {
    latestState = data;
    // If this is a board update, redraw board.png
    if (data?.data?.data?.board) {
      renderBoardToPNG(data.data.data.board);
    }
  }
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
      broadcast(parsed, true);
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

// ✅ REST endpoint for SL prims (raw JSON)
app.get("/state", (req, res) => {
  res.json(latestState);
});

// ✅ Serve board.png
app.get("/board.png", (req, res) => {
  const filePath = path.join(__dirname, "board.png");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Board not ready");
  }
});

// Function: render the board into board.png
function renderBoardToPNG(board) {
  const cellSize = 20;
  const width = board[0].length * cellSize;
  const height = board.length * cellSize;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0].length; x++) {
      let val = board[y][x];
      if (val && val !== 0) {
        ctx.fillStyle = val; // already a hex string like "#3877FF"
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  fs.writeFileSync(path.join(__dirname, "board.png"), canvas.toBuffer("image/png"));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
