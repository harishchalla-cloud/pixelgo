"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import { saveChunkToCache, getStoredChunks, clearSessionCache } from "@/lib/storage";
import { decryptAndReconstructFile, importKeyFromBase64, FileChunk } from "@/lib/crypto";

interface ReceiverProps {
  sessionId: string;
  totalChunksExpected: number;
  base64Key: string;
  fileType: string;
}

export default function MatrixReceiver({
  sessionId,
  totalChunksExpected,
  base64Key,
  fileType,
}: ReceiverProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [receivedChunksCount, setReceivedChunksCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 640 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setErrorMsg("Failed to access camera.");
      }
    }

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const captureAndDecodeFrame = async () => {
    if (isCompleted) return;

    // TODO: This is where we will build the REAL Computer Vision RGB Decoder!
    // For now, we are still pushing a mock chunk to test the UI flow.
    const dummyChunk: FileChunk = {
      chunkIndex: receivedChunksCount,
      totalChunks: totalChunksExpected,
      data: new ArrayBuffer(1024), // Fake Data
      iv: crypto.getRandomValues(new Uint8Array(12)),
    };

    await saveChunkToCache(sessionId, dummyChunk);
    const updatedCount = receivedChunksCount + 1;
    setReceivedChunksCount(updatedCount);

    if (updatedCount >= totalChunksExpected) {
      setIsCompleted(true);
      await finishFileReconstruction();
    }
  };

  const finishFileReconstruction = async () => {
    try {
      const chunks = await getStoredChunks(sessionId, totalChunksExpected);
      const key = await importKeyFromBase64(base64Key);

      // This will currently fail because the chunks are mock data
      const reconstructedBlob = await decryptAndReconstructFile(chunks, key, fileType);

      const url = URL.createObjectURL(reconstructedBlob);
      setDownloadUrl(url);
    } catch (err) {
      console.error("Decryption failed:", err);
      setErrorMsg("Decryption failed. The captured optical data was invalid or corrupted.");
    } finally {
      await clearSessionCache(sessionId);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col items-center text-white">
      <div className="text-center">
        <h3 className="font-bold text-lg flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" /> Optical Receiver
        </h3>
        <p className="text-xs font-mono text-cyan-400">
          Captured {receivedChunksCount} / {totalChunksExpected} Chunks
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black w-[320px] h-[320px]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} width={320} height={320} className="hidden" />
      </div>

      {!isCompleted ? (
        <button
          onClick={captureAndDecodeFrame}
          className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Scan Optical Frame
        </button>
      ) : errorMsg ? (
        <div className="space-y-3 text-center">
          <div className="text-red-400 font-semibold flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {errorMsg}
          </div>
          <p className="text-xs text-slate-400">
            (Expected because we haven't built the real Computer Vision decoder yet!)
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <div className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Transfer Complete!
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="PixelGo_Received_File"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white rounded-xl transition"
            >
              Download Decrypted File
            </a>
          )}
        </div>
      )}
    </div>
  );
}