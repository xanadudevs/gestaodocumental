import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LicenseStatusBadge from "@/components/LicenseStatusBadge";
import LicenseActions from "@/components/LicenseActions";
import CopyLinkButton from "@/components/CopyLinkButton";
import { LICENSE_ACTION_LABELS, LICENSE_TYPE_LABELS, formatDate } from "@/lib/labels";
import { canDecideOnLicense, canEditLicense, canManageLicenses } from "@/lib/permissions";
import {
  ACTIVE_LICENSE_STATUSES,
  countActiveLicenses,
  getLicenseProduct,
  isAtLimit,
  limitFor,
  productName,
  usageText,
} from "@/lib/licenses";
import { unitCodeOf } from "@/lib/orgChart";
import { LicenseStatus } from "@/lib/enums";

export default async function LicenseRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const request = await prisma.licenseRequest.findUnique({
    where: { id },
    include: {
      coordination: { select: { name: true } },
      direction: { select: { name: true } },
      coordinator: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      events: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!request) notFound();

  const product = getLicenseProduct(request.product);
  const used = await countActiveLicenses(
    prisma,
    { directionId: request.directionId, coordinationId: request.coordinationId },
    request.product
  );
  const limit = product ? limitFor(product, unitCodeOf(request.coordination.name)) : null;

  const canDecide =
    request.status === LicenseStatus.PENDING &&
    canDecideOnLicense(session.user.role, request.coordinatorId, session.user.id);
  const isSupport = canManageLicenses(session.user.role);
  const canEdit = canEditLicense(session.user.role, request.status, request.coordinatorId, session.user.id);
  const canGrant = isSupport && request.status === LicenseStatus.APPROVED;
  const canRevoke = isSupport && ACTIVE_LICENSE_STATUSES.includes(request.status);

  const rows: [string, React.ReactNode][] = [
    ["Email profissional", request.beneficiaryEmail],
    ...(request.jobTitle ? [["Função", request.jobTitle] as [string, React.ReactNode]] : []),
    ["Gestor de Projeto", `${request.superiorName} (${request.superiorEmail})`],
    ["Unidade", request.coordination.name],
    ["Direção", request.direction.name],
    ["Coordenador que aprova", request.coordinator.name ?? request.coordinator.email],
    ...(request.project ? [["Projeto / equipa", request.project] as [string, React.ReactNode]] : []),
    ["Justificação", <span className="whitespace-pre-wrap">{request.justification}</span>],
    [
      "Pedido por",
      `${request.requestedBy ? (request.requestedBy.name ?? request.requestedBy.email) : "Formulário público (sem login)"} em ${formatDate(request.createdAt)}`,
    ],
    ...(request.decisionReason
      ? [["Motivo", <span className="italic">{request.decisionReason}</span>] as [string, React.ReactNode]]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/licencas" className="text-sm text-gray-500 hover:text-brand-600">
        ← Licenças
      </Link>

      <div className="rounded-md border bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{request.beneficiaryName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {productName(request.product)} {LICENSE_TYPE_LABELS[request.licenseType] ?? request.licenseType}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Link
                href={`/licencas/${request.id}/editar`}
                className="rounded-md border px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Editar
              </Link>
            )}
            <LicenseStatusBadge status={request.status} />
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-gray-500">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {product && (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-sm ${isAtLimit(limit, used) ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}
          >
            {product.maxPerUnit ? request.coordination.name : request.direction.name}: {usageText(product.name, limit, used)}
            {canDecide && isAtLimit(limit, used) && " — não é possível aprovar sem libertar uma licença."}
          </p>
        )}
      </div>

      {request.status === LicenseStatus.PENDING && !canDecide && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            A aguardar aprovação de <strong>{request.coordinator.name ?? request.coordinator.email}</strong>. O pedido
            aparece-lhe em Licenças → Para eu aprovar; se quiseres, envia-lhe esta ligação (Teams, email…).
          </p>
          <CopyLinkButton />
        </div>
      )}

      {(canDecide || canGrant || canRevoke) && (
        <LicenseActions requestId={request.id} canDecide={canDecide} canGrant={canGrant} canRevoke={canRevoke} />
      )}

      <div className="rounded-md border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Histórico</h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-600">
          {request.events.map((e) => (
            <li key={e.id} className={e.action === "EMAIL_FAILED" ? "text-amber-700" : undefined}>
              <span className="font-medium text-gray-800">
                {e.actor ? (e.actor.name ?? e.actor.email) : "Pedido sem login"}
              </span>{" "}
              {LICENSE_ACTION_LABELS[e.action] ?? e.action}
              {e.meta && <span className="italic"> — {e.meta}</span>}
              <span className="ml-2 text-xs text-gray-400">{formatDate(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
