import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Level, LicenseAction, LicenseStatus, LicenseType, Role } from "@/lib/enums";
import {
  OPEN_LICENSE_STATUSES,
  countActiveLicenses,
  getLicenseProduct,
  productName,
  resolveDirection,
} from "@/lib/licenses";
import { licenseRequestMailInclude, notify, requestedMail } from "@/lib/licenseMail";

const schema = z.object({
  product: z.string(),
  licenseType: z.nativeEnum(LicenseType),
  beneficiaryName: z.string().trim().min(1, "Nome em falta"),
  beneficiaryEmail: z.string().trim().toLowerCase().email("Email profissional inválido"),
  jobTitle: z.string().trim().optional(),
  superiorName: z.string().trim().min(1, "Nome do superior em falta"),
  superiorEmail: z.string().trim().toLowerCase().email("Email do superior inválido"),
  coordinationId: z.string().min(1, "Coordenação em falta"),
  coordinatorId: z.string().min(1, "Coordenador em falta"),
  project: z.string().trim().optional(),
  justification: z.string().trim().min(1, "Justificação em falta"),
  // Campo-armadilha para bots: pessoas nunca o preenchem.
  website: z.string().optional(),
});

// Público: o formulário de pedido não exige login. Com sessão, o pedido
// fica associado a quem o fez.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actorId = session?.user.id ?? null;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;
  if (data.website) return NextResponse.json({ ok: true }, { status: 201 });

  const product = getLicenseProduct(data.product);
  if (!product || !product.types.includes(data.licenseType)) {
    return NextResponse.json({ error: "Licença inválida" }, { status: 400 });
  }

  const direction = await resolveDirection(prisma, data.coordinationId);
  if (!direction) {
    return NextResponse.json({ error: "Coordenação inválida (tem de pertencer a uma Direção)" }, { status: 400 });
  }

  // Só quem pode aprovar (coordenação/direção ou aprovador/admin) pode ser
  // indicado como coordenador.
  const coordinator = await prisma.user.findFirst({
    where: {
      id: data.coordinatorId,
      OR: [
        { level: { in: [Level.COORDENACAO, Level.DIRECAO] } },
        { role: { in: [Role.ADMIN, Role.APPROVER] } },
      ],
    },
  });
  if (!coordinator) return NextResponse.json({ error: "Coordenador inválido" }, { status: 400 });

  const existing = await prisma.licenseRequest.findFirst({
    where: {
      product: product.key,
      beneficiaryEmail: data.beneficiaryEmail,
      status: { in: OPEN_LICENSE_STATUSES },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Já existe um pedido ${product.name} em curso ou ativo para ${data.beneficiaryEmail}` },
      { status: 409 }
    );
  }

  if (product.countedTypes.includes(data.licenseType)) {
    const active = await countActiveLicenses(prisma, direction.id, product.key);
    if (active >= product.maxPerDirection) {
      return NextResponse.json(
        {
          error: `A ${direction.name} já tem ${active} de ${product.maxPerDirection} licenças ${product.name} ocupadas. É preciso libertar uma antes de pedir outra.`,
        },
        { status: 409 }
      );
    }
  }

  const request = await prisma.licenseRequest.create({
    data: {
      product: product.key,
      licenseType: data.licenseType,
      status: LicenseStatus.PENDING,
      beneficiaryName: data.beneficiaryName,
      beneficiaryEmail: data.beneficiaryEmail,
      jobTitle: data.jobTitle || null,
      superiorName: data.superiorName,
      superiorEmail: data.superiorEmail,
      project: data.project || null,
      justification: data.justification,
      coordinationId: data.coordinationId,
      directionId: direction.id,
      coordinatorId: coordinator.id,
      requestedById: actorId,
      events: { create: { actorId, action: LicenseAction.REQUESTED } },
    },
    include: licenseRequestMailInclude,
  });

  await notify(
    request.id,
    actorId,
    requestedMail(request),
    `Coordenador sem email - não foi possível notificar para aprovar o pedido ${productName(product.key)}`
  );

  return NextResponse.json({ id: request.id }, { status: 201 });
}
