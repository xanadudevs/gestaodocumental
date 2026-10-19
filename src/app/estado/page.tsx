import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { STATUS_LABELS, loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import StatusSummaryCards from "@/components/StatusSummaryCards";
import StatusBoard from "@/components/StatusBoard";
import StatusAdminPanel from "@/components/StatusAdminPanel";
import StatusBadge from "@/components/StatusBadge";

export default async function StatusPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const isAdmin = canManageUsers(session.user.role);

  const now = new Date();
  const [systems, events] = await Promise.all([
    loadSystems(prisma, now),
    prisma.statusEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { system: { select: { name: true } } },
    }),
  ]);
  const summary = summarize(systems, now);
  const problems = systems.filter((s) => s.status === "DOWN" || s.status === "DEGRADED");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Estado dos sistemas</h1>
          <p className="text-sm text-gray-500">
            Semáforo OK / não OK de cada sistema e dos seus componentes (aplicação, base de dados, serviços...).
            O estado do sistema é o pior dos seus componentes.
          </p>
        </div>
        <Link
          href="/estado/relatorio"
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Relatório
        </Link>
      </div>

      <StatusSummaryCards summary={summary} />

      {problems.length > 0 && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3">
          <h2 className="mb-2 text-sm font-semibold text-red-800">Atenção ({problems.length})</h2>
          <ul className="space-y-1 text-sm">
            {problems
              .sort((a, b) => (a.status === b.status ? 0 : a.status === "DOWN" ? -1 : 1))
              .map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-600">
                    {s.components
                      .filter((c) => c.status === "DOWN" || c.status === "DEGRADED")
                      .map((c) => `${c.name}${c.note ? ` (${c.note})` : ""}`)
                      .join(", ")}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {isAdmin && <StatusAdminPanel empty={systems.length === 0} />}

      <StatusBoard
        isAdmin={isAdmin}
        systems={systems.map((s) => ({
          id: s.id,
          name: s.name,
          unitCode: s.unitCode,
          ownerName: s.ownerName,
          criticality: s.criticality,
          status: s.status,
          stale: s.stale,
          components: s.components.map((c) => ({ ...c, statusAt: c.statusAt.toISOString() })),
        }))}
      />

      {events.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Últimas alterações</h2>
          <ul className="divide-y rounded-md border bg-white text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="w-36 text-xs text-gray-400">{formatDate(e.createdAt)}</span>
                <span className="font-medium">
                  {e.system.name} · {e.componentName}
                </span>
                <span className="text-gray-500">
                  {STATUS_LABELS[e.fromStatus] ?? e.fromStatus} → {STATUS_LABELS[e.toStatus] ?? e.toStatus}
                </span>
                {e.note && <span className="text-gray-600">— {e.note}</span>}
                {e.actorName && <span className="ml-auto text-xs text-gray-400">{e.actorName}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
