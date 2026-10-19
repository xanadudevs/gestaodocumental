import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { COMPONENT_KIND_LABELS, STATUS_LABELS, STATUS_STYLES, UNIT_LABELS, UNIT_ORDER, loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import { isValidStatusToken } from "@/lib/statusPublic";
import StatusSummaryCards, { StatusBar } from "@/components/StatusSummaryCards";
import StatusBadge from "@/components/StatusBadge";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Estado dos sistemas DANAD", robots: { index: false, follow: false } };

// Página sem login mas protegida por token (?token=...), só de leitura. Mostra apenas o estado de
// cada sistema e dos seus componentes (aplicação, base de dados, serviços):
// não expõe responsáveis, notas nem quem alterou.
export default async function PublicStatusPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!isValidStatusToken(token)) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-xl font-semibold">Estado dos sistemas DANAD</h1>
        <p className="mb-4 text-sm text-gray-500">Indica o token de acesso para ver o estado dos sistemas.</p>
        <form method="get" className="flex gap-2">
          <input
            name="token"
            type="password"
            required
            autoFocus
            placeholder="Token"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Ver
          </button>
        </form>
        {token && <p className="mt-2 text-sm text-red-600">Token inválido.</p>}
      </div>
    );
  }

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
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">Ainda não há sistemas registados. Um Administrador tem de os importar em /estado.</p>
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
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-md border bg-white p-3 text-sm ${
                        s.status === "DOWN"
                          ? "border-red-300"
                          : s.status === "DEGRADED"
                            ? "border-amber-300"
                            : s.status === "OK"
                              ? "border-green-200"
                              : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{s.name}</span>
                        <StatusBadge status={s.status} />
                      </div>
                      <ul className="mt-2 space-y-1 border-t pt-2">
                        {s.components.map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[c.status].dot}`} />
                              {c.name}
                              <span className="text-gray-400">{COMPONENT_KIND_LABELS[c.kind] ?? c.kind}</span>
                            </span>
                            <span className={c.status === "OK" ? "text-green-700" : c.status === "UNKNOWN" ? "text-gray-500" : "font-medium text-red-700"}>
                              {STATUS_LABELS[c.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
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
