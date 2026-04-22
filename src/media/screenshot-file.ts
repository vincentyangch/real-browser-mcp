import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function savePngDataUrl(input: {
  dataUrl: string;
  outputDir: string;
  filenamePrefix: string;
}): {
  savedTo: string;
  mimeType: "image/png";
  bytes: number;
} {
  const match = input.dataUrl.match(/^data:(image\/png);base64,(.+)$/);
  if (!match) {
    throw new Error("Expected a PNG data URL");
  }

  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  mkdirSync(input.outputDir, { recursive: true });

  const filename = `${input.filenamePrefix}-${Date.now()}.png`;
  const savedTo = join(input.outputDir, filename);
  writeFileSync(savedTo, bytes);

  return {
    savedTo,
    mimeType: "image/png",
    bytes: bytes.byteLength,
  };
}
