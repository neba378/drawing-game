"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatMessage {
  sender: string;
  text: string;
  isCorrect?: boolean;
  timestamp?: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isDrawer: boolean;
}

export default function ChatBox({
  messages,
  onSendMessage,
  isDrawer,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isDrawer) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <Card className="h-64 flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`text-sm ${
              msg.isCorrect ? "text-green-600 font-semibold" : ""
            }`}
          >
            <span className="text-gray-500 text-xs">[{msg.timestamp}] </span>
            <span className="font-medium">{msg.sender}:</span> {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isDrawer ? "Cannot chat while drawing" : "Type your guess..."
            }
            disabled={isDrawer}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isDrawer || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
