"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface GameTimerProps {
  timeLeft: number;
}

export default function GameTimer({ timeLeft }: GameTimerProps) {
  const [progress, setProgress] = useState(100);
  const [color, setColor] = useState("bg-green-500");

  useEffect(() => {
    console.log("GameTimer: timeLeft =", timeLeft);
    const maxTime = 80;
    const percentage = Math.max(0, (timeLeft / maxTime) * 100);
    setProgress(percentage);

    if (percentage < 25) {
      setColor("bg-red-500");
    } else if (percentage < 50) {
      setColor("bg-yellow-500");
    } else {
      setColor("bg-green-500");
    }
  }, [timeLeft]);

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <div className="w-24 sm:w-32 flex items-center gap-2">
        <Progress
          value={progress}
          className={`h-2 ${color} transition-all duration-500 ease-in-out`}
        />
        <span className="text-sm font-medium">{Math.max(0, timeLeft)}s</span>
      </div>
    </div>
  );
}
