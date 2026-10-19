import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { UNIT_LABELS, UNIT_ORDER, loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import StatusSummaryCards, { StatusBar } from "@/components/StatusSummaryCards";
import StatusBadge from "@/components/StatusBadge";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Estado dos sistemas DANAD" };

// Página pública (sem login) e só de leitura. Mostra apenas o estado de
// cada sistema: não expõe responsáveis, notas, componentes nem quem alterou.
export default async function PublicStatusPage() {
  const systems = await loadSystems(prisma);
  const summary = summarize(systems);
  const rank = { DOWN: 0, DEGRADED: 1, UNKNOWN: 2, OK: 3 } as const;

  return (
    <div>
      <AutoRefresh seconds={60} />
      <h1 className="text-xl font-semibold">Estado dos sistemas DANAD</h1>
      <p className="mb-4 text-sm text-gray-500">
        Atualizado em {formatDate(summary.generatedAt)} · esta página atualiza-se sozinha
      </p>

      {systems.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">Sem dados de momento.</p>
      ) : (
        <>
          <StatusSummaryCards summary={summary} />

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {summary.byUnit
              .sort((a, b) => UNIT_ORDER.indexOf(a.unit) - UNIT_ORDER.indexOf(b.unit))
              .map((u) => (
                <div key={u.unit} className="rounded-md border bg-white p-3">
                  <p className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{UNIT_LABELS[u.unit] ?? u.unit}</span>
                    <span className="font-semibold">{u.pctOk.toLocaleString("pt-PT")}% OK</span>
                  </p>
                  <div className="mt-2">
                    <StatusBar counts={u.counts} />
                  </div>
                </div>
              ))}
          </div>

          {UNIT_ORDER.map((code) => {
            const items = systems
              .filter((s) => s.unitCode === code)
              .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
            if (items.length === 0) return null;
            return (
              <section key={code} className="mb-5">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">{UNIT_LABELS[code]}</h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                      <span className="truncate">{s.name}</span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
