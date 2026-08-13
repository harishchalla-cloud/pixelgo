"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Smartphone, Camera, UploadCloud, CloudOff, Laptop, Lock } from "lucide-react";
import { generateSessionKey, encryptAndChunkFile, FileChunk } from "@/lib/crypto";
import WebRTCBroadcaster from "@/components/WebRTCBroadcaster";
import WebRTCReceiver from "@/components/WebRTCReceiver";
import InBrowserScanner from "@/components/InBrowserScanner";

// --- THE ENCRYPTED PIXEL MATRIX VISUALIZER ---
const PixelGoBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodes: any[] = [];
    const streams: any[] = [];
    let mouse = { x: -1000, y: -1000 };
    let ringAngle = 0;

    const initNetwork = () => {
      nodes.length = 0;
      const numNodes = Math.floor((width * height) / 10000);
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          id: i,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.random() * 3 + 2,
          connections: [],
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ringAngle += 0.001;
      const centerX = width / 2;
      const centerY = height / 2;
      const tunnelRadius = Math.min(width, height) * 0.4;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ringAngle);

      ctx.beginPath();
      ctx.arc(0, 0, tunnelRadius, 0, Math.PI * 2);
      ctx.setLineDash([4, 12, 40, 12]);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, tunnelRadius * 0.85, 0, Math.PI * 2);
      ctx.setLineDash([2, 8]);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.04)";
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.restore();

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.connections = [];
      });

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        const distToMouse = Math.hypot(n1.x - mouse.x, n1.y - mouse.y);
        if (distToMouse < 250) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 - distToMouse / 800})`;
          ctx.stroke();

          if (Math.random() < 0.08) {
            streams.push({ start: n1, end: mouse, progress: 0, speed: Math.random() * 0.02 + 0.02 });
          }
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

          if (dist < 120) {
            n1.connections.push(n2);
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - dist / 1200})`;
            ctx.stroke();

            if (Math.random() < 0.003) {
              streams.push({ start: n1, end: n2, progress: 0, speed: Math.random() * 0.015 + 0.01 });
            }
          }
        }
      }

      for (let i = streams.length - 1; i >= 0; i--) {
        const stream = streams[i];
        stream.progress += stream.speed;

        if (stream.progress >= 1) {
          streams.splice(i, 1);
          continue;
        }

        const currentX = stream.start.x + (stream.end.x - stream.start.x) * stream.progress;
        const currentY = stream.start.y + (stream.end.y - stream.start.y) * stream.progress;
        const tailX = stream.start.x + (stream.end.x - stream.start.x) * Math.max(0, stream.progress - 0.15);
        const tailY = stream.start.y + (stream.end.y - stream.start.y) * Math.max(0, stream.progress - 0.15);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = `rgba(6, 182, 212, ${Math.sin(stream.progress * Math.PI)})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#06b6d4";
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      nodes.forEach((node) => {
        ctx.fillStyle = "rgba(147, 197, 253, 0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#3b82f6";
        ctx.fillRect(node.x - node.size / 2, node.y - node.size / 2, node.size, node.size);
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(draw);
    };

    initNetwork();
    draw();

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; initNetwork(); };
    const handleMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};
// -----------------------------------

export default function Home() {
  const [mode, setMode] = useState<"idle" | "sender" | "receiver" | "scanning">("idle");
  const [isDragging, setIsDragging] = useState(false);

  const [chunks, setChunks] = useState<FileChunk[]>([]);
  const [exportedKey, setExportedKey] = useState("");
  const [fileDetails, setFileDetails] = useState({ name: "", type: "" });

  const [incomingPeerId, setIncomingPeerId] = useState("");
  const [incomingKey, setIncomingKey] = useState("");
  const [incomingChunks, setIncomingChunks] = useState(0);
  const [incomingType, setIncomingType] = useState("");
  const [incomingName, setIncomingName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peerParam = params.get("peer");
    if (peerParam) {
      setIncomingPeerId(peerParam);
      setIncomingKey(params.get("key") || "");
      setIncomingChunks(parseInt(params.get("chunks") || "0", 10));
      setIncomingType(params.get("type") || "application/octet-stream");
      setIncomingName(params.get("name") || "PixelGo_File");
      setMode("receiver");
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    const key = await generateSessionKey();
    const payload = await encryptAndChunkFile(selectedFile, key);
    setChunks(payload.chunks);
    setExportedKey(payload.keyExported);
    setFileDetails({ name: payload.fileName, type: payload.fileType });
    setMode("sender");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleScanSuccess = (peer: string, key: string, chunks: number, type: string, name: string) => {
    setIncomingPeerId(peer);
    setIncomingKey(key);
    setIncomingChunks(chunks);
    setIncomingType(type);
    setIncomingName(name);
    setMode("receiver");
  };

  const resetApp = () => {
    setMode("idle");
    setChunks([]);
    window.history.replaceState({}, document.title, "/");
  };

  return (
    <main className="relative min-h-screen bg-[#030712] text-white flex flex-col items-center p-4 sm:p-6 pt-10 sm:pt-16 overflow-x-hidden selection:bg-cyan-500/30">

      {/* Deep Space Background gradient & The Encrypted Pixel Matrix */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-[#030712] to-[#030712] z-0 pointer-events-none" />
      <PixelGoBackground />

      <div className="relative z-10 max-w-5xl w-full text-center space-y-8 sm:space-y-12">

        {/* Cinematic Header */}
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-cyan-950/40 text-cyan-300 font-semibold tracking-widest uppercase text-[10px] sm:text-xs border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> AES-256 End-to-End Encryption
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-600 drop-shadow-[0_0_40px_rgba(6,182,212,0.4)] pb-2">
            PixelGo
          </h1>
          <p className="text-slate-300 text-base sm:text-xl md:text-2xl max-w-2xl mx-auto font-light leading-relaxed px-2">
            Secure, <span className="text-cyan-400 font-medium drop-shadow-md">zero-server</span> file sharing.
            Stream encrypted payloads directly between devices via WebRTC.
          </p>
        </div>

        {mode === "idle" && (
          <div className="animate-in fade-in zoom-in-95 duration-1000 delay-150 space-y-8 sm:space-y-12">

            {/* --- MOBILE-FRIENDLY P2P VISUALIZER --- */}
            <div className="relative max-w-4xl mx-auto h-56 sm:h-64 md:h-72 flex items-center justify-between px-3 sm:px-10 md:px-16 bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.1)] group overflow-hidden">

              {/* Internal Grid Pattern (The "Matrix") */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:16px_16px] sm:bg-[size:24px_24px] pointer-events-none" />

              {/* Left Node (Sender) */}
              <div className="relative flex flex-col items-center z-20">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] transition-all duration-500 backdrop-blur-md">
                  <Laptop className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="mt-2 sm:mt-4 text-cyan-400 font-mono text-[9px] sm:text-xs uppercase tracking-widest bg-cyan-950/80 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full border border-cyan-500/30">Sender</div>
              </div>

              {/* The Cloud (Top Center - Safely Bypassed) */}
              <div className="absolute left-1/2 top-3 sm:top-5 md:top-6 -translate-x-1/2 flex flex-col items-center z-20">
                <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-red-950/40 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <CloudOff className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)]" />
                  {/* Red Forcefield Radar Ping */}
                  <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping opacity-30" />
                </div>
                <div className="mt-1.5 sm:mt-2 md:mt-3 text-red-400 font-mono text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] bg-red-950/80 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-red-500/30">
                  Cloud Bypassed
                </div>
              </div>

              {/* Center Cryptographic Data Tunnel */}
              <div className="absolute left-16 right-16 sm:left-28 sm:right-28 md:left-32 md:right-32 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none h-12 sm:h-16">

                {/* The Core Laser Line */}
                <div className="absolute w-full h-px bg-cyan-500/30 border-t-2 border-dashed border-cyan-400/40" />

                {/* Flying Encrypted Pixels (Data Packets) */}
                <div className="absolute w-full h-full overflow-hidden">
                  <div className="absolute w-4 h-4 sm:w-6 sm:h-6 bg-cyan-400/20 border border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-[pixelStream_2.5s_linear_infinite] flex items-center justify-center backdrop-blur-sm">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-sm animate-pulse" />
                  </div>
                  <div className="absolute w-3.5 h-3.5 sm:w-5 sm:h-5 bg-blue-400/20 border border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[pixelStream_2.5s_linear_infinite] flex items-center justify-center backdrop-blur-sm" style={{ animationDelay: '0.8s' }}>
                     <div className="w-1 h-1 bg-white rounded-sm animate-pulse" />
                  </div>
                  <div className="absolute w-5 h-5 sm:w-8 sm:h-8 bg-teal-400/20 border border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.8)] animate-[pixelStream_2.5s_linear_infinite] flex items-center justify-center backdrop-blur-sm" style={{ animationDelay: '1.6s' }}>
                     <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-sm animate-pulse" />
                  </div>
                </div>

                {/* Cryptographic Lock */}
                <div className="absolute w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-slate-900/90 backdrop-blur-xl rounded-lg sm:rounded-xl border border-cyan-500/50 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                   <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-cyan-400" />
                </div>
              </div>

              {/* Right Node (Receiver) */}
              <div className="relative flex flex-col items-center z-20">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] transition-all duration-500 backdrop-blur-md">
                  <Smartphone className="w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="mt-2 sm:mt-4 text-cyan-400 font-mono text-[9px] sm:text-xs uppercase tracking-widest bg-cyan-950/80 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full border border-cyan-500/30">Receiver</div>
              </div>

              <style jsx>{`
                @keyframes pixelStream {
                  0% { left: 0%; transform: translateY(-50%) rotate(0deg) scale(0.5); opacity: 0; }
                  10% { opacity: 1; transform: translateY(-50%) rotate(45deg) scale(1); }
                  90% { opacity: 1; transform: translateY(-50%) rotate(315deg) scale(1); }
                  100% { left: 100%; transform: translateY(-50%) rotate(360deg) scale(0.5); opacity: 0; }
                }
              `}</style>
            </div>
            {/* ------------------------------------- */}

            {/* Drop & Scan Action Zone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">

              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-8 sm:p-14 rounded-[2rem] sm:rounded-[3rem] border-2 transition-all cursor-pointer overflow-hidden group backdrop-blur-xl z-20 ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-900/20 scale-105 shadow-[0_0_50px_rgba(6,182,212,0.4)]"
                    : "border-white/10 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                }`}
              >
                <input type="file" onChange={handleFileSelect} className="hidden" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <UploadCloud className={`w-10 h-10 sm:w-14 sm:h-14 mb-3 sm:mb-4 transition-all duration-500 relative z-10 ${isDragging ? "text-cyan-300 scale-125" : "text-slate-300 group-hover:text-cyan-400 group-hover:-translate-y-2"}`} />
                <h3 className="font-bold text-xl sm:text-2xl text-white relative z-10">Initialize Transfer</h3>

                <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2 mb-3 sm:mb-4 text-center relative z-10">Drag & drop payload here<br/>or click to browse</p>
                <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-cyan-400 font-mono tracking-[0.2em] uppercase relative z-10 bg-cyan-950/80 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-cyan-500/30">
                  Infinite Capacity
                </div>
              </label>

              <button
                onClick={() => setMode("scanning")}
                className="relative flex flex-col items-center justify-center p-8 sm:p-14 rounded-[2rem] sm:rounded-[3rem] border-2 border-solid border-white/10 bg-slate-900/50 backdrop-blur-xl hover:border-blue-500/50 hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all group cursor-pointer overflow-hidden z-20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Camera className="w-10 h-10 sm:w-14 sm:h-14 text-slate-300 mb-3 sm:mb-4 group-hover:text-blue-400 transition-all duration-500 group-hover:scale-125 relative z-10" />
                <h3 className="font-bold text-xl sm:text-2xl text-white relative z-10">Scan Handshake</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2 text-center relative z-10">Activate camera to establish<br/>secure WebRTC tunnel</p>
              </button>

            </div>

          </div>
        )}

        {/* Dynamic Mode Injectors */}
        <div className="animate-in zoom-in-95 fade-in duration-700 relative z-30">
          {mode === "scanning" && <InBrowserScanner onScan={handleScanSuccess} onCancel={resetApp} />}
          {mode === "sender" && <WebRTCBroadcaster chunks={chunks} fileName={fileDetails.name} fileType={fileDetails.type} totalChunks={chunks.length} encryptionKey={exportedKey} onReset={resetApp} />}
          {mode === "receiver" && <WebRTCReceiver sessionId="pixelgo_transfer" peerId={incomingPeerId} totalChunksExpected={incomingChunks} base64Key={incomingKey} fileType={incomingType} fileName={incomingName} onReset={resetApp} />}
        </div>
      </div>
    </main>
  );
}