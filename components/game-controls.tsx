"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Trash2 } from "lucide-react";

interface GameControlsProps {
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onClearCanvas: () => void;
}

export default function GameControls({
  onColorChange,
  onBrushSizeChange,
  onClearCanvas,
}: GameControlsProps) {
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [previousColor, setPreviousColor] = useState("#000000");

  const colors = [
    "#000000", // Black
    "#ffffff", // White
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ffff00", // Yellow
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#ffa500", // Orange
    "#800080", // Purple
    "#a52a2a", // Brown
    "#808080", // Gray
  ];

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setIsEraser(false);
    setPreviousColor(newColor);
    onColorChange(newColor);
  };

  const handleBrushSizeChange = (value: number[]) => {
    const newSize = value[0];
    setBrushSize(newSize);
    onBrushSizeChange(newSize);
  };

  const handleEraser = () => {
    setIsEraser(!isEraser);
    if (!isEraser) {
      setPreviousColor(color);
      onColorChange("#ffffff");
      setColor("#ffffff");
    } else {
      onColorChange(previousColor);
      setColor(previousColor);
    }
  };

  const handleClearCanvas = () => {
    onClearCanvas();
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            className={`w-6 h-6 rounded-full ${
              color === c ? "ring-2 ring-offset-2 ring-blue-500" : ""
            } hover:scale-110 transition-transform`}
            style={{
              backgroundColor: c,
              border: c === "#ffffff" ? "1px solid #ccc" : "none",
            }}
            onClick={() => handleColorChange(c)}
            aria-label={`Select ${c} color`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-[150px]">
        <span className="text-xs">Size:</span>
        <Slider
          value={[brushSize]}
          min={1}
          max={20}
          step={1}
          onValueChange={handleBrushSizeChange}
          className="w-full max-w-[150px]"
        />
        <span className="text-xs w-5">{brushSize}</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={isEraser ? "default" : "outline"}
          size="icon"
          onClick={handleEraser}
          title="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleClearCanvas}
          title="Clear Canvas"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
