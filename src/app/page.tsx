"use client";

import { useState } from "react";
import { Shield, Smartphone, HardDrive, Lock } from "lucide-react";
import { generateSessionKey, encryptAndChunkFile } from "@/lib/crypto";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFileLocally = async () => {
    if (!file) return;
    setStatus("Encrypting file locally in browser memory...");
    
    const key = await generateSessionKey();
    const payload = await encryptAndChunkFile(file, key);
    
    setStatus(`File encrypted successfully into ${payload.totalChunks} chunks! Zero data sent to servers.`);
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
          Transfer encrypted files screen-to-camera using dynamic RGB matrices. No Wi-Fi, Bluetooth, or servers required.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
          />

          {file && (
            <button
              onClick={processFileLocally}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:opacity-90 transition"
            >
              Encrypt & Prepare Optical Transfer
            </button>
          )}

          {status && (
            <div className="p-4 bg-slate-800/80 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm text-left font-mono">
              {status}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-6">
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <Lock className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">Zero-Server Encryption</h3>
            <p className="text-xs text-slate-400">Files are encrypted locally with AES-256-GCM before optical conversion.</p>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">Optical Transfer</h3>
            <p className="text-xs text-slate-400">Data streams through high-density RGB matrix flashes read by any phone camera.</p>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
            <HardDrive className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-sm">100% Client Memory</h3>
            <p className="text-xs text-slate-400">Zero bandwidth costs. Completely compliant with GDPR and Irish DPC rules.</p>
          </div>
        </div>
      </div>
    </main>
  );
}