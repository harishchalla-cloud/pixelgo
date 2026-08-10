// src/lib/colorMath.ts

// 8 Colors = 3 bits of data per square (000 to 111)
export const RGB_PALETTE = [
  { r: 0,   g: 0,   b: 0,   hex: "#000000" }, // 000
  { r: 255, g: 255, b: 255, hex: "#FFFFFF" }, // 001
  { r: 255, g: 0,   b: 0,   hex: "#FF0000" }, // 010
  { r: 0,   g: 255, b: 0,   hex: "#00FF00" }, // 011
  { r: 0,   g: 0,   b: 255, hex: "#0000FF" }, // 100
  { r: 255, g: 255, b: 0,   hex: "#FFFF00" }, // 101
  { r: 255, g: 0,   b: 255, hex: "#FF00FF" }, // 110
  { r: 0,   g: 255, b: 255, hex: "#00FFFF" }  // 111
];

export function bufferToColors(buffer: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buffer);
  let binaryString = "";

  for (let i = 0; i < bytes.length; i++) {
    binaryString += bytes[i].toString(2).padStart(8, '0');
  }

  while (binaryString.length % 3 !== 0) {
    binaryString += "0";
  }

  const colorIndices = [];
  for (let i = 0; i < binaryString.length; i += 3) {
    const threeBits = binaryString.substring(i, i + 3);
    colorIndices.push(parseInt(threeBits, 2));
  }

  return colorIndices;
}

export function getClosestColorIndex(r: number, g: number, b: number): number {
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < RGB_PALETTE.length; i++) {
    const p = RGB_PALETTE[i];
    const distance = Math.sqrt(
      Math.pow(p.r - r, 2) + Math.pow(p.g - g, 2) + Math.pow(p.b - b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  return closestIndex;
}

export function colorsToBuffer(indices: number[]): ArrayBuffer {
  let binaryString = "";
  for (const idx of indices) {
    binaryString += idx.toString(2).padStart(3, '0');
  }

  const validBitsLength = Math.floor(binaryString.length / 8) * 8;
  const validBinary = binaryString.substring(0, validBitsLength);

  const bytes = new Uint8Array(validBinary.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const byteStr = validBinary.substring(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteStr, 2);
  }

  return bytes.buffer;
}