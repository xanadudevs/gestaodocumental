import { prisma } from "@/lib/prisma";
import {
  CRITICALITY_LABELS,
  STATUS_LABELS,
  UNIT_ORDER,
  loadSystems,
  summarize,
  systemsByImpact,
  type StatusSummary,
  type SystemView,
} from "@/lib/status";
import { formatDate } from "@/lib/labels";
import StatusSummaryCards, { StatusBar } from "@/components/StatusSummaryCards";
import StatusBadge from "@/components/StatusBadge";
import CopyReportButton from "@/components/CopyReportButton";
import PrintButton from "@/components/PrintButton";

const fmt = (n: number) => n.toLocaleString("pt-PT");
const MAX_SHOWN = 4;

function affectedParts(s: SystemView) {
  return s.components
    .filter((c) => c.status !== "OK")
    .map((c) => `${c.name}: ${STATUS_LABELS[c.status].toLowerCase()}${c.note ? ` (${c.note})` : ""}`);
}

function buildText(ranked: SystemView[], summary: StatusSummary) {
  const { systems: c } = summary;
  const lines = [
    `Estado dos sistemas DANAD — ${formatDate(summary.generatedAt)}`,
    "",
    `${fmt(summary.pctOk)}% dos sistemas OK (${c.OK} de ${c.total})`,
    `Degradados: ${c.DEGRADED} · Em baixo: ${c.DOWN} · Por verificar: ${c.UNKNOWN}`,
    `Verificados: ${fmt(summary.pctVerified)}%${summary.stale ? ` · ${summary.stale} com estado desatualizado (>2 h)` : ""}`,
    "",
    "Por unidade:",
    ...summary.byUnit.map(
      (u) => `- ${u.unit}: ${fmt(u.pctOk)}% OK (${u.counts.OK}/${u.counts.total}); ${u.counts.DOWN} em baixo, ${u.counts.DEGRADED} degradados, ${u.counts.UNKNOWN} por verificar`
    ),
  ];
  if (ranked.length) {
    lines.push("", "Prioridade (por impacto = criticidade × gravidade):");
    ranked.forEach((s, i) => {
      const parts = affectedParts(s);
      const shown = parts.slice(0, MAX_SHOWN).join("; ") + (parts.length > MAX_SHOWN ? `; +${parts.length - MAX_SHOWN}` : "");
      lines.push(
        `${i + 1}. ${s.name} — ${STATUS_LABELS[s.status]} · ${CRITICALITY_LABELS[s.criticality] ?? s.criticality}${s.ownerName ? ` · ${s.ownerName}` : ""}${shown ? ` · ${shown}` : ""}`
      );
    });
  }
  return lines.join("\n");
}

// Resumo e relatório do estado dos sistemas, para pôr no topo da página de
// estado (a de /estado e a partilhada): totais, por unidade e a lista de
// sistemas que não estão OK ordenada por impacto.
export default async function StatusOverview({ systems: given }: { systems?: SystemView[] }) {
  const systems = given ?? (await loadSystems(prisma));
  const summary = summarize(systems);
  const ranked = systemsByImpact(systems);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <CopyReportButton text={buildText(ranked, summary)} />
        <PrintButton />
      </div>

      <StatusSummaryCards summary={summary} />

      <h2 className="mb-2 text-sm font-semibold text-gray-700">Por unidade</h2>
      <div className="mb-6 overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">% OK</th>
              <th className="px-3 py-2">OK</th>
              <th className="px-3 py-2">Degradado</th>
              <th className="px-3 py-2">Em baixo</th>
              <th className="px-3 py-2">Por verificar</th>
              <th className="w-40 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {summary.byUnit
              .sort((a, b) => UNIT_ORDER.indexOf(a.unit) - UNIT_ORDER.indexOf(b.unit))
              .map((u) => (
                <tr key={u.unit}>
                  <td className="px-3 py-2">{u.label}</td>
                  <td className="px-3 py-2 font-semibold">{fmt(u.pctOk)}%</td>
                  <td className="px-3 py-2">{u.counts.OK}</td>
                  <td className="px-3 py-2">{u.counts.DEGRADED}</td>
                  <td className="px-3 py-2">{u.counts.DOWN}</td>
                  <td className="px-3 py-2">{u.counts.UNKNOWN}</td>
                  <td className="px-3 py-2">
                    <StatusBar counts={u.counts} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold text-gray-700">Prioridade: sistemas que não estão OK ({ranked.length})</h2>
      <p className="mb-2 text-xs text-gray-500">
        Ordenados por impacto (criticidade × gravidade): primeiro os críticos em baixo, depois os importantes em
        baixo e os críticos degradados, e assim por diante. Os por verificar vêm no fim de cada nível.
      </p>
      {ranked.length === 0 ? (
        <p className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Todos os sistemas estão OK.
        </p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Sistema</th>
                <th className="px-3 py-2">Criticidade</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Componentes afetados</th>
                <th className="px-3 py-2">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranked.map((s, i) => {
                const parts = affectedParts(s);
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          s.criticality === "HIGH" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {CRITICALITY_LABELS[s.criticality] ?? s.criticality}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <span className="text-xs text-gray-400">
                        {parts.length} de {s.components.length}
                      </span>{" "}
                      {parts.slice(0, MAX_SHOWN).join("; ")}
                      {parts.length > MAX_SHOWN && ` … +${parts.length - MAX_SHOWN}`}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{s.ownerName ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
