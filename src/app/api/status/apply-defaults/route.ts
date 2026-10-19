import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyComponentDefaults } from "@/lib/statusDefaults";
import { requireAdmin } from "@/lib/statusApi";

// Atualiza os componentes dos sistemas já existentes (LIGHT por ULS, PNB por
// serviço, "Serviços / API" nos restantes).
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await applyComponentDefaults(prisma));
}
