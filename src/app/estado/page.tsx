import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { STATUS_LABELS, loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import { publicStatusPath } from "@/lib/statusPublic";
import StatusMiniSummary from "@/components/StatusMiniSummary";
import StatusTabs from "@/components/StatusTabs";
import StatusBoard from "@/components/StatusBoard";
import StatusAdminPanel from "@/components/StatusAdminPanel";

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Estado dos sistemas</h1>
          <p className="text-sm text-gray-500">
            Submissão: atualiza o estado de cada sistema e dos seus componentes (aplicação, base de dados,
            serviços...). O estado do sistema é o pior dos seus componentes. O relatório está no outro separador.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={publicStatusPath()}
            target="_blank"
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
            title="Página sem login, protegida por token, para os gestores"
          >
            Página partilhada ↗
          </Link>
        </div>
      </div>

      <StatusTabs section="submissao" />

      <StatusMiniSummary summary={summarize(systems, now)} />

      {isAdmin && <StatusAdminPanel empty={systems.length === 0} existing={systems.map((s) => s.name)} />}

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
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
