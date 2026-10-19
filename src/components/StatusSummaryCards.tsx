import { STATUS_LABELS, STATUS_STYLES, type StatusSummary } from "@/lib/status";

const ORDER = ["OK", "DEGRADED", "DOWN", "UNKNOWN"] as const;

// Barra empilhada com a proporção de cada estado.
export function StatusBar({ counts }: { counts: StatusSummary["systems"] }) {
  if (counts.total === 0) return <div className="h-3 rounded-full bg-gray-100" />;
  return (
    <div
      className="flex h-3 overflow-hidden rounded-full bg-gray-100"
      role="img"
      aria-label={ORDER.map((s) => `${STATUS_LABELS[s]}: ${counts[s]}`).join(", ")}
    >
      {ORDER.map((s) =>
        counts[s] > 0 ? (
          <div key={s} className={STATUS_STYLES[s].bar} style={{ width: `${(counts[s] / counts.total) * 100}%` }} />
        ) : null
      )}
    </div>
  );
}

export default function StatusSummaryCards({ summary }: { summary: StatusSummary }) {
  const { systems, pctOk, pctVerified } = summary;
  const allOk = systems.total > 0 && systems.OK === systems.total;
  const tone = allOk
    ? "border-green-300 bg-green-50"
    : systems.DOWN > 0
      ? "border-red-300 bg-red-50"
      : systems.DEGRADED > 0
        ? "border-amber-300 bg-amber-50"
        : "border-gray-200 bg-white";

  return (
    <div className="mb-5 space-y-3">
      <div className={`rounded-md border p-4 ${tone}`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Sistemas OK</p>
            <p className="text-4xl font-semibold">
              {pctOk.toLocaleString("pt-PT")}%
              <span className="ml-2 text-base font-normal text-gray-500">
                {systems.OK} de {systems.total}
              </span>
            </p>
          </div>
          <p className="text-sm text-gray-600">
            {pctVerified.toLocaleString("pt-PT")}% já verificados
            {summary.stale > 0 && <span className="text-amber-700"> · {summary.stale} com estado desatualizado</span>}
          </p>
        </div>
        <div className="mt-3">
          <StatusBar counts={systems} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ORDER.map((s) => (
          <div key={s} className="rounded-md border bg-white p-3">
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_STYLES[s].dot}`} />
              {STATUS_LABELS[s]}
            </p>
            <p className="mt-1 text-2xl font-semibold">{systems[s]}</p>
            <p className="text-xs text-gray-400">
              {summary.components[s]} componente{summary.components[s] === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
