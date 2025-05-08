"use client";

import { useState, useEffect, useRef } from "react";
import GameControls from "@/components/game-controls";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";

interface DrawingUpdate {
  type: "line" | "clear";
  color?: string;
  brushSize?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
}

interface GameCanvasProps {
  isDrawer: boolean;
  onDrawingUpdate: (update: DrawingUpdate) => void;
  drawingUpdates: DrawingUpdate[];
}

export default function GameCanvas({
  isDrawer,
  onDrawingUpdate,
  drawingUpdates,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const undoStack = useRef<DrawingUpdate[]>([]);
  const redoStack = useRef<DrawingUpdate[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initialize canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Redraw all updates
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawingUpdates.forEach((update) => {
      if (update.type === "line" && update.from && update.to) {
        ctx.beginPath();
        ctx.moveTo(update.from.x * canvas.width, update.from.y * canvas.height);
        ctx.lineTo(update.to.x * canvas.width, update.to.y * canvas.height);
        ctx.strokeStyle = update.color || "#000000";
        ctx.lineWidth = update.brushSize || 5;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (update.type === "clear") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, [drawingUpdates]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    setIsDrawing(true);
    setLastPos({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    const update: DrawingUpdate = {
      type: "line",
      color,
      brushSize,
      from: lastPos,
      to: { x, y },
    };

    // Draw locally
    ctx.beginPath();
    ctx.moveTo(lastPos.x * canvas.width, lastPos.y * canvas.height);
    ctx.lineTo(x * canvas.width, y * canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();

    // Emit update
    onDrawingUpdate(update);

    // Update stacks
    undoStack.current.push(update);
    redoStack.current = [];

    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const [lastPos, setLastPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const update: DrawingUpdate = { type: "clear" };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    onDrawingUpdate(update);
    undoStack.current.push(update);
    redoStack.current = [];
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    // No canvas clear needed; just update color
  };

  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || undoStack.current.length === 0) return;

    const lastUpdate = undoStack.current.pop();
    if (lastUpdate) {
      redoStack.current.push(lastUpdate);
    }

    // Redraw canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    undoStack.current.forEach((update) => {
      if (update.type === "line" && update.from && update.to) {
        ctx.beginPath();
        ctx.moveTo(update.from.x * canvas.width, update.from.y * canvas.height);
        ctx.lineTo(update.to.x * canvas.width, update.to.y * canvas.height);
        ctx.strokeStyle = update.color || "#000000";
        ctx.lineWidth = update.brushSize || 5;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (update.type === "clear") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Emit drawing updates to sync with other clients
    onDrawingUpdate({ type: "clear" });
    undoStack.current.forEach((update) => onDrawingUpdate(update));
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || redoStack.current.length === 0) return;

    const nextUpdate = redoStack.current.pop();
    if (nextUpdate) {
      undoStack.current.push(nextUpdate);

      // Redraw canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      undoStack.current.forEach((update) => {
        if (update.type === "line" && update.from && update.to) {
          ctx.beginPath();
          ctx.moveTo(
            update.from.x * canvas.width,
            update.from.y * canvas.height
          );
          ctx.lineTo(update.to.x * canvas.width, update.to.y * canvas.height);
          ctx.strokeStyle = update.color || "#000000";
          ctx.lineWidth = update.brushSize || 5;
          ctx.lineCap = "round";
          ctx.stroke();
        } else if (update.type === "clear") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      });

      // Emit drawing updates to sync with other clients
      onDrawingUpdate({ type: "clear" });
      undoStack.current.forEach((update) => onDrawingUpdate(update));
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[500px] bg-white border border-gray-200 dark:border-gray-700"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {isDrawer && (
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={undoStack.current.length === 0}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRedo}
            disabled={redoStack.current.length === 0}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      {isDrawer && (
        <GameControls
          onColorChange={handleColorChange}
          onBrushSizeChange={handleBrushSizeChange}
          onClearCanvas={handleClearCanvas}
        />
      )}
    </div>
  );
}
