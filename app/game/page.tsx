"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GameCanvas from "@/components/game-canvas";
import ChatBox from "@/components/chat-box";
import PlayersList from "@/components/players-list";
import WordSelection from "@/components/word-selection";
import GameTimer from "@/components/game-timer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { io, type Socket } from "socket.io-client";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types for our game state
type Player = {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
};

type GameState = {
  status: "waiting" | "selecting" | "drawing" | "roundEnd" | "gameEnd";
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  currentWord?: string;
  currentDrawer?: string;
  wordOptions?: string[];
  players: Player[];
  winner?: Player;
};

type DrawingUpdate = {
  type: "line" | "clear";
  color?: string;
  brushSize?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
};

export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentRound: 0,
    totalRounds: 5,
    timeLeft: 80,
    players: [],
  });
  const [isDrawer, setIsDrawer] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      sender: string;
      text: string;
      isCorrect?: boolean;
      timestamp?: string;
    }>
  >([]);
  const [drawingUpdates, setDrawingUpdates] = useState<DrawingUpdate[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Sound effects
  const correctSound = useRef<HTMLAudioElement | null>(null);
  const roundEndSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // This runs only on the client
    correctSound.current = new Audio("/sounds/correct.mp3");
    roundEndSound.current = new Audio("/sounds/round-end.mp3");
  }, []);
  useEffect(() => {
    const roomIdParam = searchParams.get("roomId");
    const playerName = searchParams.get("name") || "Guest";
    const rounds = Number.parseInt(searchParams.get("rounds") || "5");

    if (socketRef.current) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    console.log(`Connecting to socket at: ${socketUrl}`);
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const onConnect = () => {
      console.log("Socket connected, ID:", newSocket.id);
      setIsConnected(true);
      toast({
        title: "Connected to game server",
        description: "You've successfully joined the game",
      });

      if (roomIdParam) {
        console.log(`Joining room: ${roomIdParam} as ${playerName}`);
        newSocket.emit("joinGame", { roomId: roomIdParam, playerName });
        setRoomId(roomIdParam);
      } else {
        console.log(`Creating new room for ${playerName}`);
        newSocket.emit("createGame", { playerName, rounds });
        newSocket.once("gameCreated", ({ roomId }) => {
          console.log(`Room created: ${roomId}`);
          setRoomId(roomId);
          router.replace(`/game?roomId=${roomId}&name=${playerName}`);
        });
      }
    };

    const onConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
      toast({
        title: "Connection Error",
        description: `Failed to connect: ${error.message}`,
        variant: "destructive",
      });
    };

    const onDisconnect = (reason: string) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      toast({
        title: "Disconnected from game server",
        description: `Connection lost: ${reason}`,
        variant: "destructive",
      });
    };

    const onGameState = (state: GameState) => {
      console.log("Received gameState:", {
        status: state.status,
        currentRound: state.currentRound,
        timeLeft: state.timeLeft,
        currentDrawer: state.currentDrawer,
        currentWord: state.currentWord,
        players: state.players.map((p) => p.id),
      });
      console.log("Current socket ID:", newSocket.id);
      console.log(
        "Is this client the drawer?",
        state.currentDrawer === newSocket.id
      );
      setGameState((prev) => ({
        ...prev,
        ...state,
        wordOptions:
          state.status === "selecting" ? prev.wordOptions : undefined,
      }));
      setIsDrawer(state.currentDrawer === newSocket.id);
    };

    const onChatMessage = (message: {
      sender: string;
      text: string;
      isCorrect?: boolean;
    }) => {
      console.log("Received chat message:", message);
      setMessages((prev) => {
        const timestamp = new Date().toLocaleTimeString();
        const newMessages = [...prev, { ...message, timestamp }];
        return newMessages.slice(-100);
      });

      if (message.isCorrect) {
        if (correctSound.current) {
          correctSound.current
            .play()
            .catch((e) => console.error("Sound error:", e));
        }
        toast({
          title: `${message.sender} guessed correctly!`,
          description: message.text,
        });
      }
    };

    const onDrawingUpdate = (update: DrawingUpdate) => {
      console.log("Received drawing update:", update);
      setDrawingUpdates((prev) => [...prev, update]);
    };

    const onDrawingUpdates = (updates: DrawingUpdate[]) => {
      console.log("Received all drawing updates:", updates.length);
      setDrawingUpdates(updates);
    };

    const onSelectWord = (words: string[]) => {
      console.log("Received word options:", words);
      setGameState((prev) => ({
        ...prev,
        status: "selecting",
        wordOptions: words,
      }));
    };

    const onRoundEnd = (roundData: { word: string }) => {
      console.log("Round ended:", roundData);
      if (roundEndSound.current) {
        roundEndSound.current
          .play()
          .catch((e) => console.error("Sound error:", e));
      }
      toast({
        title: "Round ended",
        description: `The word was "${roundData.word}"`,
      });
      setDrawingUpdates([]);
      setGameState((prev) => ({
        ...prev,
        currentWord: undefined,
        wordOptions: undefined,
      }));
    };

    const onGameEnd = (winner: Player) => {
      console.log("Game ended:", winner);
      setGameState((prev) => ({
        ...prev,
        status: "gameEnd",
        winner,
      }));

      toast({
        title: "Game Over!",
        description: `${winner.name} won with ${winner.score} points!`,
      });
    };

    newSocket.on("connect", onConnect);
    newSocket.on("connect_error", onConnectError);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("gameState", onGameState);
    newSocket.on("chatMessage", onChatMessage);
    newSocket.on("drawingUpdate", onDrawingUpdate);
    newSocket.on("drawingUpdates", onDrawingUpdates);
    newSocket.on("selectWord", onSelectWord);
    newSocket.on("roundEnd", onRoundEnd);
    newSocket.on("gameEnd", onGameEnd);

    return () => {
      console.log("Cleaning up socket listeners");
      newSocket.off("connect", onConnect);
      newSocket.off("connect_error", onConnectError);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("gameState", onGameState);
      newSocket.off("chatMessage", onChatMessage);
      newSocket.off("drawingUpdate", onDrawingUpdate);
      newSocket.off("drawingUpdates", onDrawingUpdates);
      newSocket.off("selectWord", onSelectWord);
      newSocket.off("roundEnd", onRoundEnd);
      newSocket.off("gameEnd", onGameEnd);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [toast, router]);

  const handleSelectWord = (word: string) => {
    if (socket) {
      console.log("Selecting word:", word);
      socket.emit("wordSelected", word);
      setGameState((prev) => ({
        ...prev,
        currentWord: word,
        status: "drawing",
        wordOptions: undefined,
      }));
    }
  };

  const handleSendMessage = (message: string) => {
    if (socket && message.trim()) {
      console.log("Sending message:", message);
      socket.emit("chatMessage", message);
    }
  };

  const handleDrawingUpdate = (update: DrawingUpdate) => {
    if (socket) {
      console.log("Sending drawing update:", update);
      socket.emit("drawingUpdate", update);
      setDrawingUpdates((prev) => [...prev, update]);
    }
  };

  const handleLeaveGame = () => {
    if (socket) {
      socket.disconnect();
    }
    router.push("/");
  };

  const handleForceStart = () => {
    if (socket && roomId) {
      console.log("Force starting game");
      socket.emit("startGame", { roomId });
    }
  };

  const handlePlayAgain = () => {
    if (socket && roomId) {
      console.log("Restarting game in room:", roomId);
      socket.emit("restartGame", { roomId });
      setGameState((prev) => ({
        ...prev,
        status: "waiting",
        currentRound: 0,
        timeLeft: 80,
        currentWord: undefined,
        currentDrawer: undefined,
        winner: undefined,
      }));
      setDrawingUpdates([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {!isConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connection Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Trying to reconnect to the game server...</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState.status === "gameEnd" && gameState.winner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Game Over!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">
                {gameState.winner.name} won with {gameState.winner.score}{" "}
                points!
              </p>
              <div>
                <h3 className="font-semibold">Final Scores:</h3>
                <ul className="list-disc pl-5">
                  {gameState.players
                    .sort((a, b) => b.score - a.score)
                    .map((player) => (
                      <li key={player.id}>
                        {player.name}: {player.score}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="flex gap-4">
                <Button onClick={handlePlayAgain}>Play Again</Button>
                <Button variant="outline" onClick={handleLeaveGame}>
                  Leave Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 shadow-sm p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleLeaveGame}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Leave Game
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Round {gameState.currentRound} of {gameState.totalRounds}
            </div>
            <GameTimer timeLeft={gameState.timeLeft} />
          </div>

          {gameState.status === "drawing" &&
            gameState.currentWord &&
            isDrawer && (
              <div className="bg-purple-600 text-white px-4 py-2 rounded-full text-lg font-bold">
                Draw: {gameState.currentWord}
              </div>
            )}

          {gameState.status === "drawing" && !isDrawer && (
            <div className="bg-purple-600 text-white px-4 py-2 rounded-full text-lg font-bold">
              Word:{" "}
              {gameState.currentWord
                ? "_ ".repeat(gameState.currentWord.length).trim()
                : ""}
            </div>
          )}

          {roomId && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Room: {roomId}
            </div>
          )}
        </div>
      </header>

      {gameState.status === "selecting" &&
        isDrawer &&
        gameState.wordOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <WordSelection
              words={gameState.wordOptions}
              onSelectWord={handleSelectWord}
            />
          </div>
        )}

      <div className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <PlayersList players={gameState.players} />

          {gameState.status === "waiting" && gameState.currentRound === 0 && (
            <Button
              onClick={handleForceStart}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
            >
              Force Start Game
            </Button>
          )}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <GameCanvas
              isDrawer={isDrawer}
              onDrawingUpdate={handleDrawingUpdate}
              drawingUpdates={drawingUpdates}
            />
          </div>

          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isDrawer={isDrawer && gameState.status === "drawing"}
          />
        </div>
      </div>
    </div>
  );
}
