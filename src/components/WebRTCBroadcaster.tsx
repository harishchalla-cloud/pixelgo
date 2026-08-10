"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FileChunk } from "@/lib/crypto";
import { CheckCircle2, Loader2, Smartphone, Zap } from "lucide-react";
import type { DataConnection } from "peerjs";

interface BroadcasterProps {
  chunks: FileChunk[];
  fileName: string;
  fileType: string;
  totalChunks: number;
  encryptionKey: string;
}

export default function WebRTCBroadcaster({
  chunks, fileName, fileType, totalChunks, encryptionKey
}: BroadcasterProps) {
  const [peerId, setPeerId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    // Dynamically import PeerJS so it runs purely on the client-side
    import("peerjs").then(({ default: Peer }) => {
      const peer = new Peer();

      peer.on("open", (id) => {
        setPeerId(id);
      });

      peer.on("connection", (conn) => {
        setConnected(true);
        connRef.current = conn;

        conn.on("data", (data: any) => {
          // Receiver says it's ready, send the first chunk!
          if (data === "READY") {
            conn.send({ type: "CHUNK", chunk: chunks[0] });
            setProgress(1);
          }
          // Receiver acknowledges chunk, send the next one!
          else if (typeof data === "string" && data.startsWith("ACK")) {
            const nextIndex = parseInt(data.split(":")[1], 10);
            if (nextIndex < chunks.length) {
              conn.send({ type: "CHUNK", chunk: chunks[nextIndex] });
              setProgress(nextIndex + 1);
            } else {
              conn.send({ type: "COMPLETE" });
            }
          }
        });
      });
    });
  }, [chunks]);

  const transferUrl = typeof window !== "undefined" && peerId
    ? `${window.location.origin}/?peer=${peerId}&key=${encodeURIComponent(encryptionKey)}&chunks=${totalChunks}&type=${encodeURIComponent(fileType)}`
    : "";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl">
      {!connected ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-2xl text-white">Direct P2P Tunnel Ready</h3>
            <p className="text-sm text-slate-400 mt-1">Scan to establish a secure, serverless connection.</p>
          </div>

          {peerId ? (
            <div className="p-4 bg-white rounded-xl shadow-lg mt-4 animate-in zoom-in">
              <QRCodeSVG value={transferUrl} size={256} level="M" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-cyan-400 h-64">
              <Loader2 className="w-6 h-6 animate-spin" /> Generating secure network ID...
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-400 mt-6">
            <Zap className="w-4 h-4 text-amber-400" /> Waiting for receiver to connect...
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6 w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-2">
            <Smartphone className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="text-center w-full">
            <h3 className="font-bold text-xl text-white">Device Connected!</h3>
            <p className="text-sm font-mono text-cyan-400 mt-2 truncate w-full">{fileName}</p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Transferring...</span>
              <span>{Math.round((progress / totalChunks) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-100"
                style={{ width: `${(progress / totalChunks) * 100}%` }}
              />
            </div>
          </div>

          {progress >= totalChunks && (
            <div className="text-emerald-400 font-bold flex items-center gap-2 mt-4 animate-pulse">
              <CheckCircle2 className="w-5 h-5" /> Transfer Complete
            </div>
          )}
        </div>
      )}
    </div>
  );
}