import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedSystemCatalog } from "@/lib/status";
import { requireAdmin } from "@/lib/statusApi";

// Cria os sistemas do catálogo inicial que ainda não existam. Seguro de repetir.
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await seedSystemCatalog(prisma));
}
