"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, Smartphone, HardDrive } from "lucide-react";
import { generateSessionKey, encryptAndChunkFile, FileChunk } from "@/lib/crypto";
import MatrixBroadcaster from "@/components/MatrixBroadcaster";
import MatrixReceiver from "@/components/MatrixReceiver";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"idle" | "sender" | "receiver">("idle");
  const [chunks, setChunks] = useState<FileChunk[]>([]);
  const [exportedKey, setExportedKey] = useState<string>("");
  const [fileDetails, setFileDetails] = useState<{ name: string; type: string }>({ name: "", type: "" });

  // Handshake data for the receiver
  const [incomingKey, setIncomingKey] = useState<string>("");
  const [incomingChunks, setIncomingChunks] = useState<number>(0);
  const [incomingType, setIncomingType] = useState<string>("application/octet-stream");

  // Check URL on load to see if this device is scanning a handshake link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get("key");
    const chunksParam = params.get("chunks");
    const typeParam = params.get("type");

    if (keyParam && chunksParam) {
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
          <Shield className="w-5 h-5" /> Air-Gapped Optical File Sharing
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          PixelGo
        </h1>
        <p className="text-slate-400 text-lg">
          Transfer encrypted files screen-to-camera using dynamic RGB matrices.
        </p>

        {mode === "idle" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
            />
          </div>
        )}

        {mode === "sender" && (
          <MatrixBroadcaster
            chunks={chunks}
            fileName={fileDetails.name}
            fileType={fileDetails.type}
            totalChunks={chunks.length}
            encryptionKey={exportedKey}
          />
        )}

        {mode === "receiver" && (
          <MatrixReceiver
            sessionId="pixelgo_transfer"
            totalChunksExpected={incomingChunks}
            base64Key={incomingKey}
            fileType={incomingType}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-6">
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <Lock className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">Zero-Server Encryption</h3>
            <p className="text-xs text-slate-400">Files are encrypted locally with AES-256-GCM.</p>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">Optical Transfer</h3>
            <p className="text-xs text-slate-400">Data streams through high-density RGB matrix flashes.</p>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <HardDrive className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">100% Client Memory</h3>
            <p className="text-xs text-slate-400">Zero bandwidth costs. Fully compliant with privacy laws.</p>
          </div>
        </div>
      </div>
    </main>
  );
}