"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FileChunk } from "@/lib/crypto";
import { CheckCircle2, Loader2, Smartphone, Zap, Link, XCircle, Flame, Users } from "lucide-react";
import type { DataConnection, Peer } from "peerjs";

interface BroadcasterProps {
  chunks: FileChunk[];
  fileName: string;
  fileType: string;
  totalChunks: number;
  encryptionKey: string;
  onReset: () => void;
}

export default function WebRTCBroadcaster({
  chunks, fileName, fileType, totalChunks, encryptionKey, onReset
}: BroadcasterProps) {
  const [peerId, setPeerId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // MESH BROADCAST STATE
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // BURN AFTER READING STATE
  const [burnMode, setBurnMode] = useState(false);
  const [isBurned, setIsBurned] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());

  const transferUrl = typeof window !== "undefined" && peerId
    ? `${window.location.origin}/?peer=${peerId}&key=${encodeURIComponent(encryptionKey)}&chunks=${totalChunks}&type=${encodeURIComponent(fileType)}&name=${encodeURIComponent(fileName)}`
    : "";

  useEffect(() => {
    import("peerjs").then(({ default: Peer }) => {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", (id) => setPeerId(id));

      peer.on("connection", (conn) => {
        // Add new connection to our Mesh Map
        connectionsRef.current.set(conn.peer, conn);
        setConnectedPeers((prev) => prev + 1);
        setProgressMap((prev) => ({ ...prev, [conn.peer]: 0 }));

        conn.on("data", async (data: any) => {
          if (data === "READY") {
            // FIREHOSE: Blast to this specific peer
            for (let i = 0; i < chunks.length; i++) {
              // Stop if burned
              if (isBurned) break;

              conn.send({ type: "CHUNK", chunk: chunks[i] });

              if (i % 15 === 0) {
                setProgressMap((prev) => ({ ...prev, [conn.peer]: i + 1 }));
                await new Promise((resolve) => setTimeout(resolve, 5));
              }
            }
            conn.send({ type: "COMPLETE" });
            setProgressMap((prev) => ({ ...prev, [conn.peer]: chunks.length }));
          }
          else if (data === "BURN_SIGNAL") {
            // The receiver downloaded it! Burn it down.
            if (burnMode) {
              triggerBurnSequence();
            }
          }
        });

        conn.on("close", () => {
          connectionsRef.current.delete(conn.peer);
          setConnectedPeers((prev) => Math.max(0, prev - 1));
        });
      });
    });

    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks, burnMode, isBurned]);

  const triggerBurnSequence = () => {
    setIsBurned(true);
    // Vibrate laptop/mobile if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }

    // Destroy all connections instantly
    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();

    // Auto reset after 3 seconds of showing the burn animation
    setTimeout(() => {
      onReset();
    }, 3500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(transferUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    if (peerRef.current) peerRef.current.destroy();
    onReset();
  };

  // Calculate average progress across all connected devices
  const avgProgress = connectedPeers === 0 ? 0 :
    Object.values(progressMap).reduce((a, b) => a + b, 0) / connectedPeers;

  if (isBurned) {
    return (
      <div className="bg-red-950 border border-red-900 rounded-2xl p-12 flex flex-col items-center shadow-[0_0_100px_rgba(220,38,38,0.5)] animate-in fade-in zoom-in duration-500">
        <Flame className="w-20 h-20 text-red-500 mb-4 animate-pulse" />
        <h3 className="font-bold text-3xl text-red-500 tracking-widest">FILE BURNED</h3>
        <p className="text-red-400/80 mt-2 font-mono">Payload securely erased from memory.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
      <button onClick={handleCancel} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition" title="Cancel">
        <XCircle className="w-6 h-6" />
      </button>

      {/* Broadcast Radar UI */}
      <div className="w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-400 border border-slate-700">
          <Users className="w-4 h-4" /> {connectedPeers} Connected
        </div>

        <button
          onClick={() => setBurnMode(!burnMode)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            burnMode ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-slate-800 text-slate-500 border border-slate-700"
          }`}
        >
          <Flame className="w-4 h-4" /> {burnMode ? "Burn After Reading: ON" : "Burn Mode: OFF"}
        </button>
      </div>

      <div className="text-center w-full relative">
        <h3 className="font-bold text-2xl text-white">Broadcast Mode</h3>
        <p className="text-sm font-mono text-cyan-400 mt-2 truncate w-full px-4">{fileName}</p>

        {peerId ? (
          <div className="relative flex justify-center mt-6 mb-6">
            {/* Cool Radar Pulse Background */}
            <div className="absolute inset-0 m-auto w-64 h-64 bg-cyan-500/10 rounded-full animate-ping opacity-50 pointer-events-none" />
            <div className="p-4 bg-white rounded-xl shadow-lg relative z-10">
              <QRCodeSVG value={transferUrl} size={200} level="M" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-cyan-400 h-64">
            <Loader2 className="w-6 h-6 animate-spin" /> Initializing P2P Mesh...
          </div>
        )}

        <button
          onClick={handleCopyLink}
          className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-sm font-semibold transition"
        >
          <Link className="w-4 h-4" /> {copied ? "Link Copied!" : "Copy Broadcast Link"}
        </button>

        {/* Global Progress Bar */}
        {connectedPeers > 0 && (
          <div className="w-full space-y-2 mt-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Sending to {connectedPeers} device(s)...</span>
              <span>{Math.round((avgProgress / totalChunks) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-100 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${(avgProgress / totalChunks) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}