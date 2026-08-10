"use client";

import { useEffect, useState } from "react";
import { FileChunk, arrayBufferToBase64 } from "@/lib/crypto";
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
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [mode, setMode] = useState<"handshake" | "streaming">("handshake");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // The handshake URL that kicks off the receiver
  const transferUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?key=${encodeURIComponent(encryptionKey)}&chunks=${totalChunks}&type=${encodeURIComponent(fileType)}`
    : "";

  useEffect(() => {
    if (mode !== "streaming" || !isPlaying || chunks.length === 0) return;

    // Scan speed: 10 frames per second (very reliable)
    const interval = setInterval(() => {
      setCurrentChunkIndex((prev) => (prev + 1) % totalChunks);
    }, 100);

    return () => clearInterval(interval);
  }, [mode, isPlaying, chunks.length, totalChunks]);

  // Convert chunk data to text payload for QR
  const getQrPayload = () => {
    const chunk = chunks[currentChunkIndex];
    return JSON.stringify({
      i: chunk.chunkIndex,
      v: arrayBufferToBase64(chunk.iv),
      d: arrayBufferToBase64(chunk.data),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center">
      {mode === "handshake" ? (
        <div className="text-center space-y-4">
          <h3 className="font-bold text-xl">1. Scan to Sync</h3>
          <QRCodeSVG value={transferUrl} size={256} level="L" />
          <button onClick={() => setMode("streaming")} className="w-full py-3 bg-cyan-500 rounded-xl font-bold">Start Stream</button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <h3 className="font-bold text-lg">{fileName}</h3>
          <p className="text-cyan-400 font-mono">Chunk {currentChunkIndex + 1} / {totalChunks}</p>
          <div className="p-4 bg-white rounded-xl">
             <QRCodeSVG value={getQrPayload()} size={300} level="L" />
          </div>
          <button onClick={() => setIsPlaying(!isPlaying)} className="px-6 py-2 bg-slate-800 rounded-lg">
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}
    </div>
  );
}