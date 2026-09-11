import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export async function saveUploadedFile(file: File) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storedName);

  await writeFile(fullPath, buffer);

  return {
    filePath: storedName,
    fileName: file.name,
    fileSize: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export function resolveUploadPath(storedName: string) {
  return path.join(UPLOAD_DIR, storedName);
}
