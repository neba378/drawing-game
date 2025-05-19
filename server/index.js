const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const setupGameSocket = require("./controllers/gameController");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Register all socket events and game logic
setupGameSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
