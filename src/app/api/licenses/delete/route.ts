import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1, "Nenhum pedido escolhido").max(500) });

// ADMIN apaga pedidos de licença (ex: pedidos de teste). O histórico de
// cada pedido é apagado com ele. Pedidos apagados deixam de contar para o
// limite da Direção.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Só um Administrador pode apagar pedidos" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { count } = await prisma.licenseRequest.deleteMany({ where: { id: { in: parsed.data.ids } } });
  return NextResponse.json({ deleted: count });
}
