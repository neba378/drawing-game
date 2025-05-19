// Game Controller: handles socket events and game flow
const { rooms, getRandomWords, selectDrawer } = require("../models/game");

function setupGameSocket(io) {
  function startRound(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.currentRound++;
    if (room.currentRound > room.totalRounds) {
      const winner = [...room.players.values()].sort(
        (a, b) => b.score - a.score
      )[0];
      io.to(roomId).emit("gameEnd", winner);
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
      return;
    }
    room.currentDrawer = nextDrawerId;
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
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      room.timeLeft--;
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
        if (room.guessedPlayers.size > 0 && room.currentDrawer) {
          const drawer = room.players.get(room.currentDrawer);
          if (drawer) drawer.score += 10;
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

  io.on("connection", (socket) => {
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
      socket.emit("chatMessage", {
        sender: "System",
        text: `Welcome to room ${roomId}! Share this code with friends to play together.`,
      });
    });

    socket.on("joinGame", ({ roomId, playerName }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("error", { message: "Room not found" });
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
      if (room.players.size >= 2 && room.currentRound === 0) {
        io.to(roomId).emit("chatMessage", {
          sender: "System",
          text: "Game is starting!",
        });
        startRound(roomId);
      }
    });

    socket.on("wordSelected", (word) => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.has(socket.id) && room.currentDrawer === socket.id) {
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
          startTimer(roomId);
          break;
        }
      }
    });

    socket.on("drawingUpdate", (update) => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.has(socket.id) && room.currentDrawer === socket.id) {
          room.drawingUpdates.push(update);
          socket.to(roomId).emit("drawingUpdate", update);
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
            if (room.currentDrawer) {
              const drawer = room.players.get(room.currentDrawer);
              if (drawer) drawer.score += 5;
            }
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
              if (room.currentDrawer) {
                const drawer = room.players.get(room.currentDrawer);
                if (drawer) drawer.score += 10;
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
        return;
      }
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
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.has(socket.id)) {
          const playerName = room.players.get(socket.id).name;
          room.players.delete(socket.id);
          io.to(roomId).emit("chatMessage", {
            sender: "System",
            text: `${playerName} left the game.`,
          });
          if (room.players.size === 0) {
            if (room.timerInterval) clearInterval(room.timerInterval);
            rooms.delete(roomId);
          } else {
            if (room.currentDrawer === socket.id) {
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
}

module.exports = setupGameSocket;
