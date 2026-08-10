"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Download, ShieldCheck } from "lucide-react";
import { saveChunkToCache, getStoredChunks, clearSessionCache } from "@/lib/storage";
import { decryptAndReconstructFile, importKeyFromBase64, FileChunk } from "@/lib/crypto";

export default function WebRTCReceiver({ peerId, totalChunksExpected, base64Key, fileType, sessionId }: any) {
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Establishing secure tunnel...");

  useEffect(() => {
    import("peerjs").then(({ default: Peer }) => {
      const peer = new Peer();

      peer.on("open", () => {
        setStatus("Tunnel established. Connecting to sender...");
        const conn = peer.connect(peerId);

        conn.on("open", () => {
          setStatus("Connected! Receiving encrypted data...");
          conn.send("READY");
        });

        conn.on("data", async (data: any) => {
          if (data.type === "CHUNK") {
            const chunk: FileChunk = data.chunk;
            await saveChunkToCache(sessionId, chunk);
            setProgress(chunk.chunkIndex + 1);

            // Tell the sender we got it, send the next one!
            conn.send(`ACK:${chunk.chunkIndex + 1}`);
          }
          else if (data.type === "COMPLETE") {
            setStatus("Data received. Decrypting locally...");

            try {
              const chunks = await getStoredChunks(sessionId, totalChunksExpected);
              const key = await importKeyFromBase64(base64Key);
              const blob = await decryptAndReconstructFile(chunks, key, fileType);

              setDownloadUrl(URL.createObjectURL(blob));
              setStatus("Transfer Complete!");
            } catch (err) {
              setStatus("Error: Decryption failed.");
            } finally {
              await clearSessionCache(sessionId);
            }
          }
        });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl text-white w-full">
      <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-4">
        {downloadUrl ? <ShieldCheck className="w-8 h-8 text-emerald-400" /> : <Download className="w-8 h-8 text-cyan-400" />}
      </div>

      <h3 className="font-bold text-xl mb-6 text-center">{status}</h3>

      {!downloadUrl ? (
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>Receiving...</span>
            <span>{Math.round((progress / totalChunksExpected) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-100"
              style={{ width: `${(progress / totalChunksExpected) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
            <Loader2 className="w-3 h-3 animate-spin" /> Do not close this tab
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-emerald-400 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Decoded Successfully
          </div>
          <a
            href={downloadUrl}
            download="PixelGo_Received_File"
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-white text-center rounded-xl shadow-lg shadow-emerald-900/50 hover:scale-105 transition transform"
          >
            Save File to Device
          </a>
        </div>
      )}
    </div>
  );
}