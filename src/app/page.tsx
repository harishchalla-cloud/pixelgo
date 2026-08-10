"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, Smartphone, Zap } from "lucide-react";
import { generateSessionKey, encryptAndChunkFile, FileChunk } from "@/lib/crypto";
import WebRTCBroadcaster from "@/components/WebRTCBroadcaster";
import WebRTCReceiver from "@/components/WebRTCReceiver";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"idle" | "sender" | "receiver">("idle");
  const [chunks, setChunks] = useState<FileChunk[]>([]);
  const [exportedKey, setExportedKey] = useState<string>("");
  const [fileDetails, setFileDetails] = useState({ name: "", type: "" });

  const [incomingPeerId, setIncomingPeerId] = useState("");
  const [incomingKey, setIncomingKey] = useState("");
  const [incomingChunks, setIncomingChunks] = useState(0);
  const [incomingType, setIncomingType] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peerParam = params.get("peer");
    const keyParam = params.get("key");
    const chunksParam = params.get("chunks");
    const typeParam = params.get("type");

    // If a phone scans the QR code, it will have these URL parameters
    if (peerParam && keyParam && chunksParam) {
      setIncomingPeerId(peerParam);
      setIncomingKey(keyParam);
      setIncomingChunks(parseInt(chunksParam, 10));
      setIncomingType(typeParam || "application/octet-stream");
      setMode("receiver");
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Encrypt file immediately in browser memory
      const key = await generateSessionKey();
      const payload = await encryptAndChunkFile(selectedFile, key);

      setChunks(payload.chunks);
      setExportedKey(payload.keyExported);
      setFileDetails({ name: payload.fileName, type: payload.fileType });
      setMode("sender");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold tracking-wide uppercase text-sm">
          <Shield className="w-5 h-5" /> End-to-End Encrypted File Transfer
        </div>

        <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          PixelGo
        </h1>
        <p className="text-slate-400 text-lg">
          Zero-server, instant peer-to-peer file sharing. Encrypted locally, transferred globally.
        </p>

        {mode === "idle" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 mt-8">
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 hover:scale-105 transition cursor-pointer shadow-lg"
            />
          </div>
        )}

        {mode === "sender" && (
          <div className="mt-8">
            <WebRTCBroadcaster
              chunks={chunks}
              fileName={fileDetails.name}
              fileType={fileDetails.type}
              totalChunks={chunks.length}
              encryptionKey={exportedKey}
            />
          </div>
        )}

        {mode === "receiver" && (
          <div className="mt-8">
            <WebRTCReceiver
              sessionId="pixelgo_transfer"
              peerId={incomingPeerId}
              totalChunksExpected={incomingChunks}
              base64Key={incomingKey}
              fileType={incomingType}
            />
          </div>
        )}

        {mode === "idle" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-12">
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
              <Lock className="w-7 h-7 text-cyan-400" />
              <h3 className="font-bold text-md">Zero-Server Encryption</h3>
              <p className="text-sm text-slate-400">Files are encrypted inside your device using military-grade AES-256 before transferring.</p>
            </div>
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
              <Zap className="w-7 h-7 text-cyan-400" />
              <h3 className="font-bold text-md">Lightning P2P Speed</h3>
              <p className="text-sm text-slate-400">Direct WebRTC tunnels bypass the cloud entirely for unlimited transfer speeds.</p>
            </div>
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
              <Smartphone className="w-7 h-7 text-cyan-400" />
              <h3 className="font-bold text-md">Cross-Platform</h3>
              <p className="text-sm text-slate-400">Scan the QR code with any iPhone, Android, or tablet. No app installation required.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}