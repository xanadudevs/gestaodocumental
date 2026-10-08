import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { aiEnabled, analyzeDocument } from "@/lib/ai";

export const maxDuration = 120;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

// Analisa os ficheiros de uma entrada com IA e devolve sugestões para
// pré-preencher o formulário. Não grava nada.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!aiEnabled()) {
    return NextResponse.json({ error: "IA não configurada (falta ANTHROPIC_API_KEY)" }, { status: 503 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Escolhe pelo menos um ficheiro" }, { status: 400 });
  if (files.some((f) => f.size > MAX_FILE_SIZE) || files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_SIZE) {
    return NextResponse.json({ error: "Ficheiros demasiado grandes para analisar" }, { status: 400 });
  }
  const hint = typeof formData.get("hint") === "string" ? (formData.get("hint") as string).slice(0, 500) : undefined;

  try {
    return NextResponse.json(await analyzeDocument(files, hint));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "IA ocupada, tenta daqui a pouco" }, { status: 429 });
    }
    console.error("analyzeDocument", err);
    const message = err instanceof Anthropic.APIError ? "Erro ao contactar a IA" : (err as Error).message;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
