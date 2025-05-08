import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Pencil } from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
}

interface PlayersListProps {
  players: Player[];
}

export default function PlayersList({ players }: PlayersListProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="h-full w-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg">Players</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="space-y-1">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-md ${
                player.isDrawing ? "bg-purple-100 dark:bg-purple-900" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 ml-2">
                  <div className="text-sm font-medium flex items-center gap-1">
                    {player.name}
                    {player.isDrawing && (
                      <Pencil className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </div>
                <div className="text-sm font-semibold">{player.score}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
