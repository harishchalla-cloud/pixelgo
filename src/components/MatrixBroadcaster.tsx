"use client";

import { useEffect, useRef, useState } from "react";
import { FileChunk } from "@/lib/crypto";
import { Play, Pause, RotateCcw } from "lucide-react";

interface BroadcasterProps {
  chunks: FileChunk[];
  fileName: string;
  totalChunks: number;
}

// 8 distinct colors mapping 3 bits per color cell
const COLOR_PALETTE = [
  "#000000", // 000 - Black
  "#FFFFFF", // 001 - White
  "#FF0000", // 010 - Red
  "#00FF00", // 011 - Green
  "#0000FF", // 100 - Blue
  "#FFFF00", // 101 - Yellow
  "#FF00FF", // 110 - Magenta
  "#00FFFF", // 111 - Cyan
];

export default function MatrixBroadcaster({
  chunks,
  fileName,
  totalChunks,
}: BroadcasterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || chunks.length === 0) return;

    const fps = 30;
    const interval = 1000 / fps;

    const renderFrame = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= interval) {
        lastFrameTime.current = timestamp;

        drawChunkToCanvas(chunks[currentChunkIndex]);

        setCurrentChunkIndex((prev) => (prev + 1) % totalChunks);
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    animationRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, currentChunkIndex, chunks, totalChunks]);

  const drawChunkToCanvas = (chunk: FileChunk) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridDim = 32; // 32x32 color matrix
    const cellSize = canvas.width / gridDim;

    const bytes = new Uint8Array(chunk.data);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < gridDim; row++) {
      for (let col = 0; col < gridDim; col++) {
        const byteIdx = (row * gridDim + col) % bytes.length;
        const colorIdx = bytes[byteIdx] % COLOR_PALETTE.length;

        ctx.fillStyle = COLOR_PALETTE[colorIdx];
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    // Alignment Corner Markers (Red/Cyan sync anchors)
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(0, 0, cellSize * 2, cellSize * 2);
    ctx.fillStyle = "#00FFFF";
    ctx.fillRect(
      canvas.width - cellSize * 2,
      canvas.height - cellSize * 2,
      cellSize * 2,
      cellSize * 2
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col items-center">
      <div className="text-center">
        <h3 className="font-bold text-lg text-white">{fileName}</h3>
        <p className="text-xs font-mono text-cyan-400">
          Broadcasting Chunk {currentChunkIndex + 1} of {totalChunks} (30 FPS)
        </p>
      </div>

      <div className="relative p-2 bg-slate-950 border border-slate-800 rounded-xl">
        <canvas
          ref={canvasRef}
          width={384}
          height={384}
          className="rounded-lg shadow-2xl"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 font-medium text-sm transition"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => setCurrentChunkIndex(0)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 font-medium text-sm transition"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>
    </div>
  );
}