"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { saveChunkToCache, getStoredChunks, clearSessionCache } from "@/lib/storage";
import { decryptAndReconstructFile, importKeyFromBase64, base64ToArrayBuffer, FileChunk } from "@/lib/crypto";

export default function MatrixReceiver({ sessionId, totalChunksExpected, base64Key, fileType }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; });

    const scan = () => {
      if (isCompleted || !videoRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
      if (ctx && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const data = ctx.getImageData(0, 0, 400, 400).data;
        const code = jsQR(data, 400, 400);
        if (code) {
          try {
            const p = JSON.parse(code.data);
            if (p.i !== undefined) {
              saveChunkToCache(sessionId, {
                chunkIndex: p.i, totalChunks: totalChunksExpected, iv: new Uint8Array(base64ToArrayBuffer(p.v)), data: base64ToArrayBuffer(p.d)
              }).then(() => setScannedCount(prev => prev + 1));
            }
          } catch(e) {}
        }
      }
      requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  }, []);

  return (
    <div className="p-6 bg-slate-900 rounded-2xl text-center">
      <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
      <canvas ref={canvasRef} width={400} height={400} className="hidden" />
      <p className="mt-4 font-bold">Captured: {scannedCount} chunks</p>
    </div>
  );
}