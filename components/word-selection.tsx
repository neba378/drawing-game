"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WordSelectionProps {
  words: string[];
  onSelectWord: (word: string) => void;
}

export default function WordSelection({
  words,
  onSelectWord,
}: WordSelectionProps) {
  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a Word to Draw</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {words.map((word, index) => (
          <Button
            key={index}
            onClick={() => onSelectWord(word)}
            className="w-full text-lg py-6 text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300"
            variant="default"
          >
            {word}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
