"use client";

import { useEffect, useRef, useState } from "react";
import { FileChunk } from "@/lib/crypto";
import { Play, Pause, RotateCcw, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface BroadcasterProps {
  chunks: FileChunk[];
  fileName: string;
  fileType: string;
  totalChunks: number;
  encryptionKey: string;
}

const COLOR_PALETTE = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00",
  "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"
];

export default function MatrixBroadcaster({
  chunks,
  fileName,
  fileType,
  totalChunks,
  encryptionKey,
}: BroadcasterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);

  // Start in "handshake" mode instead of playing immediately
  const [mode, setMode] = useState<"handshake" | "streaming">("handshake");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);

  // Construct the URL the receiver needs to scan
  const transferUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?key=${encodeURIComponent(encryptionKey)}&chunks=${totalChunks}&type=${encodeURIComponent(fileType)}`
    : "";

  useEffect(() => {
    if (mode !== "streaming" || !isPlaying || chunks.length === 0) return;

    const fps = 30; // 30 Frames per second
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
  }, [mode, isPlaying, currentChunkIndex, chunks, totalChunks]);

  const drawChunkToCanvas = (chunk: FileChunk) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridDim = 32;
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
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col items-center">

      {mode === "handshake" ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-xl text-white">Step 1: Connect Device</h3>
            <p className="text-sm text-slate-400 mt-1">Scan this code with your phone camera to securely sync the decryption key.</p>
          </div>

          <div className="p-4 bg-white rounded-xl shadow-lg">
            <QRCodeSVG value={transferUrl} size={250} level="M" />
          </div>

          <button
            onClick={() => setMode("streaming")}
            className="w-full py-3 mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <ScanLine className="w-5 h-5" /> Start Optical Stream
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-lg text-white">{fileName}</h3>
            <p className="text-xs font-mono text-cyan-400">
              Broadcasting Chunk {currentChunkIndex + 1} of {totalChunks} (30 FPS)
            </p>
          </div>

          <div className="relative p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <canvas ref={canvasRef} width={384} height={384} className="rounded-lg shadow-2xl" />
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
      )}
    </div>
  );
}