import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados no .env");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Em desenvolvimento, sem Supabase configurado, os ficheiros ficam numa
// pasta local (.uploads/) para se poder testar sem serviços externos.
function useLocalStorage() {
  return !process.env.SUPABASE_URL && process.env.NODE_ENV !== "production";
}
const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export async function saveUploadedFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;

  if (useLocalStorage()) {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, storedName), buffer);
    return {
      filePath: storedName,
      fileName: file.name,
      fileSize: buffer.byteLength,
      mimeType: file.type || "application/octet-stream",
    };
  }

  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(storedName, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao carregar ficheiro para o Supabase Storage: ${error.message}`);
  }

  return {
    filePath: storedName,
    fileName: file.name,
    fileSize: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function downloadFile(storedName: string) {
  if (useLocalStorage()) return fs.readFile(path.join(LOCAL_DIR, path.basename(storedName)));
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(storedName);
  if (error || !data) {
    throw new Error(`Falha ao obter ficheiro do Supabase Storage: ${error?.message ?? "não encontrado"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
