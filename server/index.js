const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify your actual domain
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Game state
const rooms = new Map();
const wordLists = {
  easy: [
    "dog",
    "cat",
    "house",
    "tree",
    "car",
    "sun",
    "moon",
    "fish",
    "bird",
    "book",
  ],
  medium: [
    "elephant",
    "computer",
    "bicycle",
    "airplane",
    "mountain",
    "rainbow",
    "guitar",
    "pizza",
    "castle",
    "rocket",
  ],
  hard: [
    "skyscraper",
    "astronaut",
    "submarine",
    "dinosaur",
    "waterfall",
    "lighthouse",
    "volcano",
    "orchestra",
    "kangaroo",
    "helicopter",
  ],
};

// Helper functions
function getRandomWords(count = 3) {
  const allWords = [...wordLists.easy, ...wordLists.medium, ...wordLists.hard];
  const words = [];
  if (allWords.length < count) {
    console.error("Not enough words available");
    return allWords;
  }
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * allWords.length);
    words.push(allWords[randomIndex]);
    allWords.splice(randomIndex, 1);
  }
  console.log(`Generated words: ${words}`);
  return words;
}

function selectDrawer(room) {
  const playerIds = Array.from(room.players.keys());
  if (playerIds.length === 0) return null;

  const nextDrawerIndex = (room.currentRound - 1) % playerIds.length;
  const nextDrawerId = playerIds[nextDrawerIndex];

  room.players.forEach((player, id) => {
    player.isDrawing = id === nextDrawerId;
  });

  console.log(`Selected drawer ID: ${nextDrawerId} for room ${room.roomId}`);
  return nextDrawerId;
}

function startRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    console.error(`Room ${roomId} not found`);
    return;
  }

  room.currentRound++;
  console.log(`Starting round ${room.currentRound} in room ${roomId}`);

  if (room.currentRound > room.totalRounds) {
    const winner = [...room.players.values()].sort(
      (a, b) => b.score - a.score
    )[0];
    io.to(roomId).emit("gameEnd", winner);
    console.log(`Room ${roomId} ended`);
    return;
  }

  room.status = "selecting";
  room.currentWord = null;
  room.timeLeft = 80;
  room.guessedPlayers = new Set();
  room.drawingUpdates = [];

  const nextDrawerId = selectDrawer(room);
  if (!nextDrawerId) {
    io.to(roomId).emit("chatMessage", {
      sender: "System",
      text: "No players available to draw. Ending game.",
    });
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted: no players`);
    return;
  }

  room.currentDrawer = nextDrawerId;
  console.log(`Emitting selectWord to drawer: ${nextDrawerId}`);

  const wordOptions = getRandomWords(3);
  io.to(nextDrawerId).emit("selectWord", wordOptions);

  io.to(roomId).emit("gameState", {
    status: "selecting",
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    timeLeft: room.timeLeft,
    currentDrawer: room.currentDrawer,
    players: Array.from(room.players.values()),
  });

  io.to(roomId).emit("chatMessage", {
    sender: "System",
    text: `Round ${room.currentRound}: ${
      room.players.get(nextDrawerId).name
    } is selecting a word!`,
  });
}

function startTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    console.error(`Room ${roomId} not found`);
    return;
  }

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  console.log(`Starting timer for room ${roomId}`);

  room.timerInterval = setInterval(() => {
    room.timeLeft--;

    console.log(`Timer tick for room ${roomId}: ${room.timeLeft}s`);

    io.to(roomId).emit("gameState", {
      status: room.status,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      timeLeft: room.timeLeft,
      currentDrawer: room.currentDrawer,
      players: Array.from(room.players.values()),
    });

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;

      // Award drawer bonus points if at least one player guessed correctly
      if (room.guessedPlayers.size > 0 && room.currentDrawer) {
        const drawer = room.players.get(room.currentDrawer);
        if (drawer) {
          drawer.score += 10; // Bonus for round completion with guesses
          console.log(`Drawer ${drawer.name} awarded 10 points for round end`);
        }
      }

      io.to(roomId).emit("roundEnd", { word: room.currentWord });
      io.to(roomId).emit("chatMessage", {
        sender: "System",
        text: `Time's up! The word was "${room.currentWord}"`,
      });

      io.to(roomId).emit("gameState", {
        status: "roundEnd",
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        timeLeft: room.timeLeft,
        currentDrawer: room.currentDrawer,
        players: Array.from(room.players.values()),
      });

      setTimeout(() => {
        startRound(roomId);
      }, 5000);
    }
  }, 1000);
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createGame", ({ playerName, rounds }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    rooms.set(roomId, {
      roomId,
      status: "waiting",
      players: new Map([
        [
          socket.id,
          { id: socket.id, name: playerName, score: 0, isDrawing: false },
        ],
      ]),
      currentRound: 0,
      totalRounds: rounds || 5,
      currentWord: null,
      currentDrawer: null,
      timeLeft: 80,
      guessedPlayers: new Set(),
      timerInterval: null,
      drawingUpdates: [],
    });

    socket.join(roomId);
    socket.emit("gameCreated", { roomId });

    io.to(roomId).emit("gameState", {
      status: "waiting",
      currentRound: 0,
      totalRounds: rooms.get(roomId).totalRounds,
      timeLeft: 80,
      players: Array.from(rooms.get(roomId).players.values()),
    });

    console.log(`Game created: ${roomId} by ${playerName}`);

    socket.emit("chatMessage", {
      sender: "System",
      text: `Welcome to room ${roomId}! Share this code with friends to play together.`,
    });
  });

  socket.on("joinGame", ({ roomId, playerName }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("error", { message: "Room not found" });
      console.error(`Join failed: Room ${roomId} not found`);
      return;
    }

    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      score: 0,
      isDrawing: false,
    });

    socket.join(roomId);
    socket.emit("joinedGame", { roomId });

    if (room.drawingUpdates.length > 0) {
      socket.emit("drawingUpdates", room.drawingUpdates);
    }

    io.to(roomId).emit("gameState", {
      status: room.status,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      timeLeft: room.timeLeft,
      currentWord: room.currentDrawer === socket.id ? room.currentWord : null,
      currentDrawer: room.currentDrawer,
      players: Array.from(room.players.values()),
    });

    io.to(roomId).emit("chatMessage", {
      sender: "System",
      text: `${playerName} joined the game!`,
    });

    console.log(
      `Player ${playerName} joined room ${roomId} with socket ID: ${socket.id}`
    );

    if (room.players.size >= 2 && room.currentRound === 0) {
      console.log(
        `Starting game in room ${roomId} with ${room.players.size} players`
      );
      io.to(roomId).emit("chatMessage", {
        sender: "System",
        text: "Game is starting!",
      });
      startRound(roomId);
    }
  });

  socket.on("wordSelected", (word) => {
    console.log(`wordSelected received from socket ${socket.id}: ${word}`);
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id) && room.currentDrawer === socket.id) {
        console.log(
          `Processing wordSelected for room ${roomId}, drawer: ${socket.id}`
        );
        room.currentWord = word;
        room.status = "drawing";
        room.drawingUpdates = [];

        io.to(roomId).emit("drawingUpdate", { type: "clear" });

        io.to(roomId).emit("gameState", {
          status: "drawing",
          currentRound: room.currentRound,
          totalRounds: room.totalRounds,
          timeLeft: room.timeLeft,
          currentWord: null,
          currentDrawer: room.currentDrawer,
          players: Array.from(room.players.values()),
        });

        socket.emit("gameState", {
          status: "drawing",
          currentRound: room.currentRound,
          totalRounds: room.totalRounds,
          timeLeft: room.timeLeft,
          currentWord: word,
          currentDrawer: room.currentDrawer,
          players: Array.from(room.players.values()),
        });

        io.to(roomId).emit("chatMessage", {
          sender: "System",
          text: `${room.players.get(socket.id).name} is drawing now!`,
        });

        console.log(
          `Starting timer for room ${roomId} after word selection: ${word}`
        );
        startTimer(roomId);
        break;
      } else {
        console.log(
          `wordSelected ignored: socket ${socket.id} is not drawer or not in room ${roomId}`
        );
      }
    }
  });

  socket.on("drawingUpdate", (update) => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id) && room.currentDrawer === socket.id) {
        room.drawingUpdates.push(update);
        socket.to(roomId).emit("drawingUpdate", update);
        console.log(`Drawing update in room ${roomId}: ${update.type}`);
        break;
      }
    }
  });

  socket.on("chatMessage", (message) => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);

        if (room.currentDrawer === socket.id && room.status === "drawing") {
          socket.emit("chatMessage", {
            sender: "System",
            text: "You can't chat while drawing!",
          });
          return;
        }

        if (
          room.currentWord &&
          room.currentDrawer !== socket.id &&
          message.toLowerCase() === room.currentWord.toLowerCase() &&
          !room.guessedPlayers.has(socket.id) &&
          room.status === "drawing"
        ) {
          room.guessedPlayers.add(socket.id);
          const scoreGain = Math.floor(room.timeLeft * 10);
          player.score += scoreGain;

          // Award drawer points for each correct guess
          if (room.currentDrawer) {
            const drawer = room.players.get(room.currentDrawer);
            if (drawer) {
              drawer.score += 5; // 5 points per correct guess
              console.log(
                `Drawer ${drawer.name} awarded 5 points for correct guess by ${player.name}`
              );
            }
          }

          console.log(
            `Player ${player.name} guessed correctly in room ${roomId}`
          );

          io.to(roomId).emit("chatMessage", {
            sender: "System",
            text: `${player.name} guessed the word "${room.currentWord}" correctly! (+${scoreGain} points)`,
            isCorrect: true,
          });

          io.to(roomId).emit("gameState", {
            status: room.status,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            timeLeft: room.timeLeft,
            currentDrawer: room.currentDrawer,
            players: Array.from(room.players.values()),
          });

          const nonDrawingPlayers = room.players.size - 1;
          if (
            room.guessedPlayers.size >= nonDrawingPlayers &&
            nonDrawingPlayers > 0
          ) {
            if (room.timerInterval) {
              clearInterval(room.timerInterval);
              room.timerInterval = null;
            }

            // Award drawer bonus points for round completion
            if (room.currentDrawer) {
              const drawer = room.players.get(room.currentDrawer);
              if (drawer) {
                drawer.score += 10; // Bonus for round completion
                console.log(
                  `Drawer ${drawer.name} awarded 10 points for round completion`
                );
              }
            }

            io.to(roomId).emit("roundEnd", { word: room.currentWord });
            io.to(roomId).emit("chatMessage", {
              sender: "System",
              text: `Everyone guessed correctly! The word was "${room.currentWord}"`,
            });

            io.to(roomId).emit("gameState", {
              status: "roundEnd",
              currentRound: room.currentRound,
              totalRounds: room.totalRounds,
              timeLeft: room.timeLeft,
              currentDrawer: room.currentDrawer,
              players: Array.from(room.players.values()),
            });

            setTimeout(() => {
              startRound(roomId);
            }, 5000);
          }
        } else {
          io.to(roomId).emit("chatMessage", {
            sender: player.name,
            text: message,
          });
        }
        break;
      }
    }
  });

  socket.on("startGame", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    console.log(`Game manually started in room ${roomId}`);

    if (room.currentRound === 0) {
      io.to(roomId).emit("chatMessage", {
        sender: "System",
        text: "Game is starting!",
      });
      startRound(roomId);
    }
  });

  socket.on("restartGame", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      console.error(`Restart failed: Room ${roomId} not found`);
      return;
    }

    console.log(`Restarting game in room ${roomId}`);

    // Reset room state
    room.currentRound = 0;
    room.status = "waiting";
    room.currentWord = null;
    room.currentDrawer = null;
    room.timeLeft = 80;
    room.guessedPlayers = new Set();
    room.drawingUpdates = [];
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    // Reset player scores and isDrawing
    room.players.forEach((player) => {
      player.score = 0;
      player.isDrawing = false;
    });

    io.to(roomId).emit("gameState", {
      status: "waiting",
      currentRound: 0,
      totalRounds: room.totalRounds,
      timeLeft: 80,
      currentDrawer: null,
      players: Array.from(room.players.values()),
    });

    io.to(roomId).emit("chatMessage", {
      sender: "System",
      text: "Game has been restarted! Waiting for players to start.",
    });

    // Auto-start if enough players
    if (room.players.size >= 2) {
      setTimeout(() => {
        io.to(roomId).emit("chatMessage", {
          sender: "System",
          text: "Game is starting!",
        });
        startRound(roomId);
      }, 3000);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const playerName = room.players.get(socket.id).name;
        room.players.delete(socket.id);

        console.log(`Player ${playerName} left room ${roomId}`);

        io.to(roomId).emit("chatMessage", {
          sender: "System",
          text: `${playerName} left the game.`,
        });

        if (room.players.size === 0) {
          if (room.timerInterval) {
            clearInterval(room.timerInterval);
          }
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          if (room.currentDrawer === socket.id) {
            console.log(`Drawer left room ${roomId}, starting new round`);
            if (room.timerInterval) {
              clearInterval(room.timerInterval);
              room.timerInterval = null;
            }

            io.to(roomId).emit("chatMessage", {
              sender: "System",
              text: `The drawer (${playerName}) left the game. Starting a new round.`,
            });

            startRound(roomId);
          }

          io.to(roomId).emit("gameState", {
            status: room.status,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            timeLeft: room.timeLeft,
            currentDrawer: room.currentDrawer,
            players: Array.from(room.players.values()),
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
