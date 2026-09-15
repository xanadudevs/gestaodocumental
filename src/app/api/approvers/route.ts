import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const approvers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "APPROVER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      level: true,
      unit: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(approvers);
}
