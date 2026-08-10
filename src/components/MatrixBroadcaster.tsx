"use client";

import { useEffect, useRef, useState } from "react";
import { FileChunk } from "@/lib/crypto";
import { bufferToColors, RGB_PALETTE } from "@/lib/colorMath";
import { Play, Pause, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface BroadcasterProps {
  chunks: FileChunk[];
  fileName: string;
  fileType: string;
  totalChunks: number;
  encryptionKey: string;
}

export default function MatrixBroadcaster({
  chunks, fileName, fileType, totalChunks, encryptionKey,
}: BroadcasterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [mode, setMode] = useState<"handshake" | "streaming">("handshake");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const transferUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?key=${encodeURIComponent(encryptionKey)}&chunks=${totalChunks}&type=${encodeURIComponent(fileType)}`
    : "";

  useEffect(() => {
    if (mode !== "streaming" || !isPlaying || chunks.length === 0) return;

    // Flash a new RGB matrix every 200ms (5 FPS for reliability)
    const interval = setInterval(() => {
      drawChunkToCanvas(chunks[currentChunkIndex]);
      setCurrentChunkIndex((prev) => (prev + 1) % totalChunks);
    }, 200);

    return () => clearInterval(interval);
  }, [mode, isPlaying, currentChunkIndex, chunks, totalChunks]);

  const drawChunkToCanvas = (chunk: FileChunk) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const gridDim = 32; // 32x32 colored squares
    const cellSize = canvas.width / gridDim;

    // Combine Header (Index), IV (12 bytes), and Data for the frame
    const header = new Uint16Array([chunk.chunkIndex]);
    const combinedBlob = new Blob([header, chunk.iv, chunk.data]);

    combinedBlob.arrayBuffer().then((buffer) => {
      const colorIndices = bufferToColors(buffer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let colorPointer = 0;
      for (let row = 0; row < gridDim; row++) {
        for (let col = 0; col < gridDim; col++) {
          const colorIdx = colorIndices[colorPointer] || 0; // Default to black
          ctx.fillStyle = RGB_PALETTE[colorIdx].hex;
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          colorPointer++;
        }
      }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col items-center">
      {mode === "handshake" ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-xl text-white">Step 1: Connect Device</h3>
            <p className="text-sm text-slate-400 mt-1">Scan this code with your phone's default camera app.</p>
          </div>
          <div className="p-4 bg-white rounded-xl">
            <QRCodeSVG value={transferUrl} size={250} level="M" />
          </div>
          <button
            onClick={() => setMode("streaming")}
            className="w-full py-3 mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <ScanLine className="w-5 h-5" /> Start RGB Engine
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-lg text-white">{fileName}</h3>
            <p className="text-xs font-mono text-cyan-400">
              Broadcasting Matrix {currentChunkIndex + 1} / {totalChunks}
            </p>
          </div>

          <div className="relative p-2 bg-slate-950 border-4 border-slate-800 rounded-xl">
            <canvas ref={canvasRef} width={384} height={384} className="rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.3)]" />
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause Engine" : "Resume Engine"}
          </button>
        </div>
      )}
    </div>
  );
}