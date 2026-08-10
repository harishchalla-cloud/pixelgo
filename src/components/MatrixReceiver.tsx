"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Target } from "lucide-react";
import { getClosestColorIndex, colorsToBuffer } from "@/lib/colorMath";
import { saveChunkToCache, getStoredChunks, clearSessionCache } from "@/lib/storage";
import { decryptAndReconstructFile, importKeyFromBase64, FileChunk } from "@/lib/crypto";

interface ReceiverProps {
  sessionId: string;
  totalChunksExpected: number;
  base64Key: string;
  fileType: string;
}

export default function MatrixReceiver({
  sessionId, totalChunksExpected, base64Key, fileType,
}: ReceiverProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [scannedChunks, setScannedChunks] = useState<Set<number>>(new Set());
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let requestAnimationId: number;

    async function startEngine() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 640 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          requestAnimationId = requestAnimationFrame(scanRGBMatrix);
        }
      } catch (err) {
        console.error("Camera access denied or unavailable.");
      }
    }

    const scanRGBMatrix = async () => {
      if (isCompleted) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationId = requestAnimationFrame(scanRGBMatrix);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Targeting Box logic: Assume the user aligns the square in the center
      const boxSize = Math.min(canvas.width, canvas.height) * 0.6;
      const startX = (canvas.width - boxSize) / 2;
      const startY = (canvas.height - boxSize) / 2;

      const gridDim = 32;
      const cellSize = boxSize / gridDim;
      const scannedIndices: number[] = [];

      for (let row = 0; row < gridDim; row++) {
        for (let col = 0; col < gridDim; col++) {
          const sampleX = startX + (col * cellSize) + (cellSize / 2);
          const sampleY = startY + (row * cellSize) + (cellSize / 2);

          const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
          const colorIdx = getClosestColorIndex(pixel[0], pixel[1], pixel[2]);
          scannedIndices.push(colorIdx);
        }
      }

      try {
        const rawBuffer = colorsToBuffer(scannedIndices);

        // Extract Header (Index)
        const header = new Uint16Array(rawBuffer.slice(0, 2));
        const chunkIndex = header[0];

        // Validation check to see if we grabbed a real frame
        if (chunkIndex >= 0 && chunkIndex < totalChunksExpected) {
          const iv = new Uint8Array(rawBuffer.slice(2, 14));
          const data = rawBuffer.slice(14);
          const newChunk: FileChunk = { chunkIndex, totalChunks: totalChunksExpected, iv, data };

          setScannedChunks((prevSet) => {
            if (!prevSet.has(chunkIndex)) {
              saveChunkToCache(sessionId, newChunk).then(() => {
                const newSet = new Set(prevSet).add(chunkIndex);
                if (newSet.size >= totalChunksExpected) {
                  setIsCompleted(true);
                  finishFileReconstruction();
                }
              });
            }
            return prevSet;
          });
        }
      } catch (e) {
        // Ignore noise/bad frames
      }

      requestAnimationId = requestAnimationFrame(scanRGBMatrix);
    };

    startEngine();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (requestAnimationId) cancelAnimationFrame(requestAnimationId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  const finishFileReconstruction = async () => {
    try {
      const chunks = await getStoredChunks(sessionId, totalChunksExpected);
      const key = await importKeyFromBase64(base64Key);
      const reconstructedBlob = await decryptAndReconstructFile(chunks, key, fileType);
      const url = URL.createObjectURL(reconstructedBlob);
      setDownloadUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      await clearSessionCache(sessionId);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col items-center text-white">
      <div className="text-center">
        <h3 className="font-bold text-lg flex items-center justify-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" /> RGB Decoder Engine
        </h3>
        <p className="text-xs font-mono text-cyan-400">
          Captured {scannedChunks.size} / {totalChunksExpected} Matrices
        </p>
        <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${(scannedChunks.size / totalChunksExpected) * 100}%` }} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border-4 border-slate-800 bg-black w-[320px] h-[320px]">
        <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {!isCompleted && (
          <div className="absolute inset-0 m-auto w-[60%] h-[60%] border-2 border-dashed border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold text-cyan-400 bg-black/50 px-2 py-1 rounded">ALIGN RGB MATRIX HERE</span>
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="text-sm text-slate-400 flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" /> Sampling color frequencies...
        </div>
      )}

      {isCompleted && (
        <div className="space-y-3 text-center pt-2">
          <div className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Decoded Successfully!
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="PixelGo_Received_File"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white rounded-xl transition"
            >
              Save Decrypted File
            </a>
          )}
        </div>
      )}
    </div>
  );
}