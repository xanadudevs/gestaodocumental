import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LicenseTable from "@/components/LicenseTable";
import { unitLabel } from "@/lib/orgChart";
import { canManageLicenses } from "@/lib/permissions";
import { LICENSE_PRODUCTS, getDirectionUsage, productName } from "@/lib/licenses";
import { LicenseStatus, Role } from "@/lib/enums";

type SearchParams = { scope?: string; type?: string; status?: string; direction?: string };

export default async function LicensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "all";
  const { type, status, direction } = params;
  const isSupport = canManageLicenses(session.user.role);

  const where: Prisma.LicenseRequestWhereInput = {};
  if (type) where.licenseType = type;
  if (status === "ACTIVE") where.status = { in: [LicenseStatus.APPROVED, LicenseStatus.GRANTED] };
  else if (status) where.status = status;
  if (direction) where.directionId = direction;
  if (scope === "mine") where.requestedById = session.user.id;
  if (scope === "decide") {
    where.status = LicenseStatus.PENDING;
    if (session.user.role !== Role.ADMIN) where.coordinatorId = session.user.id;
  }
  if (scope === "grant") where.status = LicenseStatus.APPROVED;

  const [requests, usage, pendingForMe, toGrant, directions] = await Promise.all([
    prisma.licenseRequest.findMany({
      where,
      include: {
        coordination: { select: { name: true } },
        direction: { select: { name: true } },
        coordinator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getDirectionUsage(prisma),
    prisma.licenseRequest.count({
      where: { status: LicenseStatus.PENDING, coordinatorId: session.user.id },
    }),
    isSupport ? prisma.licenseRequest.count({ where: { status: LicenseStatus.APPROVED } }) : 0,
    prisma.unit.findMany({
      where: { licenseRequestsDirection: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const tabs = [
    { key: "all", label: "Todas" },
    { key: "mine", label: "Os meus pedidos" },
    ...(pendingForMe > 0 || session.user.role === Role.ADMIN
      ? [{ key: "decide", label: `Para eu aprovar${pendingForMe ? ` (${pendingForMe})` : ""}` }]
      : []),
    ...(isSupport ? [{ key: "grant", label: `Para dar acesso${toGrant ? ` (${toGrant})` : ""}` }] : []),
  ];

  const typeFilters = [
    { key: undefined, label: "Full e View" },
    { key: "FULL", label: "Full" },
    { key: "VIEW", label: "View" },
  ];
  const statusFilters = [
    { key: undefined, label: "Todos os estados" },
    { key: "ACTIVE", label: "Ocupam lugar" },
    { key: "PENDING", label: "Aguarda coordenador" },
    { key: "APPROVED", label: "Aguarda atribuição" },
    { key: "GRANTED", label: "Ativas" },
    { key: "REJECTED", label: "Rejeitados" },
    { key: "REVOKED", label: "Libertadas" },
  ];

  function hrefFor(next: Partial<SearchParams>) {
    const merged = { scope, type, status, direction, ...next };
    const qs = new URLSearchParams();
    if (merged.scope && merged.scope !== "all") qs.set("scope", merged.scope);
    if (merged.type) qs.set("type", merged.type);
    if (merged.status) qs.set("status", merged.status);
    if (merged.direction) qs.set("direction", merged.direction);
    const s = qs.toString();
    return `/licencas${s ? `?${s}` : ""}`;
  }

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Licenças</h1>
        <Link
          href="/licencas/nova"
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Pedir licença
        </Link>
      </div>

      {directions.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {directions.map((d) =>
            LICENSE_PRODUCTS.map((p) => {
              const used = usage[`${d.id}:${p.key}`] ?? 0;
              const pct = Math.min(100, Math.round((used / p.maxPerDirection) * 100));
              const selected = direction === d.id;
              return (
                <Link
                  key={`${d.id}:${p.key}`}
                  href={hrefFor({ direction: selected ? undefined : d.id })}
                  className={`rounded-md border bg-white p-3 hover:border-brand-500 ${selected ? "border-brand-600 ring-1 ring-brand-600" : ""}`}
                >
                  <p className="truncate text-xs text-gray-500" title={d.name}>
                    {d.name}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-lg font-semibold">{used}</span>
                    <span className="text-gray-500">
                      {" "}
                      / {p.maxPerDirection} licenças {p.name}
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full ${used >= p.maxPerDirection ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor({ scope: tab.key })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              scope === tab.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <Link key={f.key ?? "all"} href={hrefFor({ type: f.key })} className={chip(type === f.key)}>
            {f.label}
          </Link>
        ))}
      </div>
      {scope !== "decide" && scope !== "grant" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <Link key={f.key ?? "all"} href={hrefFor({ status: f.key })} className={chip(status === f.key)}>
              {f.label}
            </Link>
          ))}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          Nenhuma licença encontrada.
        </p>
      ) : (
        <LicenseTable
          canDelete={session.user.role === Role.ADMIN}
          rows={requests.map((r) => ({
            id: r.id,
            beneficiaryName: r.beneficiaryName,
            beneficiaryEmail: r.beneficiaryEmail,
            product: productName(r.product),
            licenseType: r.licenseType,
            status: r.status,
            coordination: unitLabel(r.coordination.name),
            direction: r.direction.name,
            coordinator: r.coordinator.name ?? r.coordinator.email ?? "—",
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
