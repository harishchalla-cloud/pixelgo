import { get, set, del } from "idb-keyval";
import { FileChunk } from "./crypto";

const DB_PREFIX = "pixelgo_chunk_";

export async function saveChunkToCache(
  sessionId: string,
  chunk: FileChunk
): Promise<void> {
  const key = `${DB_PREFIX}${sessionId}_${chunk.chunkIndex}`;
  await set(key, chunk);
}

export async function getStoredChunks(
  sessionId: string,
  totalChunks: number
): Promise<FileChunk[]> {
  const chunks: FileChunk[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const key = `${DB_PREFIX}${sessionId}_${i}`;
    const chunk = await get<FileChunk>(key);
    if (chunk) {
      chunks.push(chunk);
    }
  }
  return chunks;
}

export async function clearSessionCache(sessionId: string): Promise<void> {
  for (let i = 0; i < 1000; i++) {
    const key = `${DB_PREFIX}${sessionId}_${i}`;
    const exists = await get(key);
    if (!exists) break;
    await del(key);
  }
}