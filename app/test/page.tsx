"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { io, type Socket } from "socket.io-client";

export default function TestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`,
    ]);
  };

  useEffect(() => {
    addLog("Component mounted");

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    addLog(`Attempting to connect to: ${socketUrl}`);

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      addLog(`Connected with ID: ${newSocket.id}`);
      setIsConnected(true);
    });

    newSocket.on("connect_error", (error) => {
      addLog(`Connection error: ${error.message}`);
    });

    newSocket.on("disconnect", (reason) => {
      addLog(`Disconnected: ${reason}`);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      addLog("Cleaning up socket");
      newSocket.disconnect();
    };
  }, []);

  const handleSendPing = () => {
    if (!socket) return;

    addLog("Sending ping");
    socket.emit("ping", { time: Date.now() });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>

        <Button onClick={handleSendPing} disabled={!isConnected}>
          Send Ping
        </Button>
      </div>

      <div className="border rounded p-4 bg-gray-50 h-[400px] overflow-auto">
        <h2 className="text-lg font-semibold mb-2">Logs</h2>
        <pre className="text-sm">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </pre>
      </div>
    </div>
  );
}
