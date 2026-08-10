export interface FileChunk {
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  iv: Uint8Array;
}

export interface EncryptedPayload {
  keyExported: string;
  fileName: string;
  fileType: string;
  totalChunks: number;
  chunks: FileChunk[];
}

// DROPPED TO 80: Fits perfectly inside a 16x16 RGB grid
const CHUNK_SIZE = 80;

export async function generateSessionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const binary = atob(base64Key);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey("raw", bytes.buffer, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
}

export async function encryptAndChunkFile(file: File, key: CryptoKey): Promise<EncryptedPayload> {
  const arrayBuffer = await file.arrayBuffer();
  const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);
  const chunks: FileChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
    const chunkBuffer = arrayBuffer.slice(start, end);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedChunk = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer }, key, chunkBuffer);
    chunks.push({ chunkIndex: i, totalChunks, data: encryptedChunk, iv });
  }
  const keyExported = await exportKeyToBase64(key);
  return { keyExported, fileName: file.name, fileType: file.type, totalChunks, chunks };
}

export async function decryptAndReconstructFile(chunks: FileChunk[], key: CryptoKey, fileType: string): Promise<Blob> {
  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  const decryptedBuffers: ArrayBuffer[] = [];

  for (const chunk of chunks) {
    const ivBuffer = new Uint8Array(chunk.iv).buffer;
    const decryptedChunk = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, chunk.data);
    decryptedBuffers.push(decryptedChunk);
  }
  return new Blob(decryptedBuffers, { type: fileType });
}