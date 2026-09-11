import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import path from "path";

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

export async function saveUploadedFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;

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
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(storedName);
  if (error || !data) {
    throw new Error(`Falha ao obter ficheiro do Supabase Storage: ${error?.message ?? "não encontrado"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
