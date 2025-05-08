import { io, type Socket } from "socket.io-client";

// Drawing update type
export interface DrawingUpdate {
  type: "line" | "clear";
  color?: string;
  brushSize?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
}

// This is a singleton to manage the socket connection
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Game events
export const joinGame = (
  roomId: string,
  playerName: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    socket.emit("joinGame", { roomId, playerName });

    socket.once("joinedGame", ({ roomId }) => {
      resolve(roomId);
    });

    socket.once("error", (error) => {
      reject(error);
    });

    setTimeout(() => {
      reject(new Error("Timeout joining game"));
    }, 5000);
  });
};

export const createGame = (
  playerName: string,
  rounds: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    socket.emit("createGame", { playerName, rounds });

    socket.once("gameCreated", ({ roomId }) => {
      resolve(roomId);
    });

    socket.once("error", (error) => {
      reject(error);
    });

    setTimeout(() => {
      reject(new Error("Timeout creating game"));
    }, 5000);
  });
};

export const startGame = (roomId: string): void => {
  const socket = getSocket();
  socket.emit("startGame", { roomId });
};

export const sendChatMessage = (message: string): void => {
  const socket = getSocket();
  socket.emit("chatMessage", message);
};

export const sendDrawingUpdate = (update: DrawingUpdate): void => {
  const socket = getSocket();
  socket.emit("drawingUpdate", update);
};

export const selectWord = (word: string): void => {
  const socket = getSocket();
  socket.emit("wordSelected", word);
};

export const leaveGame = (): void => {
  disconnectSocket();
};
