import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { MANAGE_STATUS_MESSAGE } from "@/lib/status";

// Qualquer utilizador autenticado atualiza estados (numa crise, quem sabe
// do sistema deve poder dizê-lo sem pedir permissão); só o Administrador
// gere o catálogo.
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) } as const;
  return { session } as const;
}

export async function requireAdmin() {
  const r = await requireUser();
  if ("error" in r) return r;
  if (!canManageUsers(r.session.user.role)) {
    return { error: NextResponse.json({ error: MANAGE_STATUS_MESSAGE }, { status: 403 }) } as const;
  }
  return r;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
