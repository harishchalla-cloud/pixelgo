"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle2, Loader2, Download, ShieldCheck, XCircle, Flame } from "lucide-react";
import { saveChunkToCache, getStoredChunks, clearSessionCache } from "@/lib/storage";
import { decryptAndReconstructFile, importKeyFromBase64, FileChunk } from "@/lib/crypto";
import type { DataConnection, Peer } from "peerjs";

interface ReceiverProps {
  peerId: string;
  totalChunksExpected: number;
  base64Key: string;
  fileType: string;
  fileName: string;
  sessionId: string;
  onReset: () => void;
}

export default function WebRTCReceiver({
  peerId, totalChunksExpected, base64Key, fileType, fileName, sessionId, onReset
}: ReceiverProps) {
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Establishing secure tunnel...");
  const [isBurned, setIsBurned] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    import("peerjs").then(({ default: Peer }) => {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", () => {
        setStatus("Connecting to mesh network...");
        const conn = peer.connect(peerId);
        connRef.current = conn;

        conn.on("open", () => {
          setStatus("Receiving ultrafast stream...");
          conn.send("READY");
          // Small haptic bump when connected
          if (navigator.vibrate) navigator.vibrate(50);
        });

        conn.on("data", async (data: any) => {
          if (data.type === "CHUNK") {
            const chunk: FileChunk = data.chunk;
            saveChunkToCache(sessionId, chunk);

            if (chunk.chunkIndex % 10 === 0 || chunk.chunkIndex === totalChunksExpected - 1) {
              setProgress(chunk.chunkIndex + 1);
            }
          }
          else if (data.type === "COMPLETE") {
            setStatus("Data received. Decrypting locally...");

            try {
              setProgress(totalChunksExpected);
              const chunks = await getStoredChunks(sessionId, totalChunksExpected);
              const key = await importKeyFromBase64(base64Key);
              const blob = await decryptAndReconstructFile(chunks, key, fileType);

              setDownloadUrl(URL.createObjectURL(blob));
              setStatus("Transfer Complete!");

              // Success Vibration!
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } catch (err) {
              setStatus("Error: Decryption failed.");
            } finally {
              await clearSessionCache(sessionId);
            }
          }
        });

        conn.on("close", () => {
          if (!downloadUrl) setStatus("Sender closed the connection.");
        });
      });
    });

    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndBurn = () => {
    // 1. Trigger the native browser download
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // 2. Send the BURN signal to the sender
    if (connRef.current) {
      connRef.current.send("BURN_SIGNAL");
    }

    // 3. UX Update for the receiver
    setIsBurned(true);
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]); // Heavy pulse

    // 4. Disconnect
    if (peerRef.current) peerRef.current.destroy();
  };

  const handleCancel = async () => {
    if (peerRef.current) peerRef.current.destroy();
    await clearSessionCache(sessionId);
    onReset();
  };

  if (isBurned) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center shadow-2xl w-full text-center">
        <ShieldCheck className="w-20 h-20 text-emerald-500 mb-4" />
        <h3 className="font-bold text-2xl text-white">File Saved Securely</h3>
        <p className="text-slate-400 mt-2 mb-6">If the sender had Burn Mode enabled, the original file has been wiped from their device.</p>
        <button onClick={onReset} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl text-white w-full relative overflow-hidden">
      {!downloadUrl && (
        <button onClick={handleCancel} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition z-10">
          <XCircle className="w-6 h-6" />
        </button>
      )}

      <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-4 relative z-10">
        {downloadUrl ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Download className="w-8 h-8 text-cyan-400" />}
      </div>

      <h3 className="font-bold text-xl mb-6 text-center relative z-10">{status}</h3>

      {!downloadUrl ? (
        <div className="w-full space-y-2 relative z-10">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>{Math.round((progress / totalChunksExpected) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-75 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              style={{ width: `${(progress / totalChunksExpected) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-4 relative z-10">
          <button
            onClick={handleSaveAndBurn}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white text-center rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition transform flex items-center justify-center gap-2 group"
          >
            <Download className="w-5 h-5" /> Save File
            <Flame className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
          </button>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Triggers Burn Sequence on Sender
          </p>
        </div>
      )}
    </div>
  );
}