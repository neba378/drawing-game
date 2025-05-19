"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Brush, Users, Trophy, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rounds, setRounds] = useState(5);
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    if (!roomCode.trim()) return;

    router.push(
      `/game?roomId=${roomCode.toUpperCase()}&name=${encodeURIComponent(
        nickname
      )}`
    );
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    router.push(`/game?name=${encodeURIComponent(nickname)}&rounds=${rounds}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-end">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44">
            <div className="font-semibold mb-2">Theme</div>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="w-full mb-1"
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="w-full mb-1"
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="w-full"
              onClick={() => setTheme("system")}
            >
              System
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
            Sketch Guess
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-2xl mb-12">
            Draw, guess, and have fun with friends in this multiplayer drawing
            and guessing game!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Users className="h-6 w-6 text-purple-500" />
                  Join a Game
                </CardTitle>
                <CardDescription>
                  Enter a room code to join an existing game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleJoinGame}>
                  <Input
                    placeholder="Your Nickname"
                    className="text-center"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Room Code"
                    className="text-center"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    required
                  />
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleJoinGame}
                  disabled={!nickname.trim() || !roomCode.trim()}
                >
                  Join Game
                </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Brush className="h-6 w-6 text-pink-500" />
                  Create a Game
                </CardTitle>
                <CardDescription>
                  Start a new game and invite friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateGame}>
                  <Input
                    placeholder="Your Nickname"
                    className="text-center"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Rounds:
                    </div>
                    <div className="flex-1 flex justify-between">
                      <Button
                        type="button"
                        variant={rounds === 3 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRounds(3)}
                      >
                        3
                      </Button>
                      <Button
                        type="button"
                        variant={rounds === 5 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRounds(5)}
                      >
                        5
                      </Button>
                      <Button
                        type="button"
                        variant={rounds === 10 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRounds(10)}
                      >
                        10
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-pink-600 hover:bg-pink-700"
                  onClick={handleCreateGame}
                  disabled={!nickname.trim()}
                >
                  Create Game
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Brush className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Draw</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Express your creativity with our drawing tools
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Play Together</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Join rooms with friends or random players
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Win Points</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Earn points by guessing correctly and quickly
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
