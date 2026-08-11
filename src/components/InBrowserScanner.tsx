"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, XCircle, Loader2 } from "lucide-react";

interface ScannerProps {
  onScan: (peerId: string, key: string, chunks: number, type: string, name: string) => void;
  onCancel: () => void;
}

export default function InBrowserScanner({ onScan, onCancel }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let requestAnimId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          requestAnimId = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        setError("Camera access denied. Please enable permissions.");
      }
    };

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

          if (code && code.data.includes("peer=")) {
            try {
              const url = new URL(code.data);
              const peer = url.searchParams.get("peer");
              const key = url.searchParams.get("key");
              const chunks = url.searchParams.get("chunks");
              const type = url.searchParams.get("type");
              const name = url.searchParams.get("name");

              if (peer && key && chunks) {
                // Update onScan to accept name as the 5th parameter
                onScan(peer, key, parseInt(chunks, 10), type || "application/octet-stream", name || "PixelGo_File");
                return;
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        }
      }
      requestAnimId = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (requestAnimId) cancelAnimationFrame(requestAnimId);
    };
  }, [onScan]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center relative shadow-2xl w-full">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
        <XCircle className="w-6 h-6" />
      </button>

      <div className="text-center mb-4">
        <h3 className="font-bold text-xl flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" /> Scan to Receive
        </h3>
        <p className="text-sm text-slate-400 mt-1">Point your camera at the sender's QR code</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-cyan-500/50 bg-black w-full max-w-[300px] aspect-square flex items-center justify-center">
        {error ? (
          <p className="text-red-400 text-sm p-4 text-center">{error}</p>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 m-auto w-3/4 h-3/4 border-2 border-dashed border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none" />
          </>
        )}
      </div>

      {!error && (
        <div className="flex items-center gap-2 text-sm text-slate-400 mt-4 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" /> Scanning for connection...
        </div>
      )}
    </div>
  );
}