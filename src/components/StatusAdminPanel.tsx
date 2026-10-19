"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CRITICALITY_LABELS, UNIT_LABELS, UNIT_ORDER } from "@/lib/status";
import { DANAD_TABLE, parseSystemsTable, type ParseResult } from "@/lib/statusImport";

export default function StatusAdminPanel({ empty, existing }: { empty: boolean; existing: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [table, setTable] = useState(empty ? DANAD_TABLE : "");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", unitCode: "UID", ownerName: "", criticality: "MEDIUM" });

  async function run(url: string, body?: unknown, describe?: (d: Record<string, unknown>) => string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro");
      setError(false);
      setMessage(describe ? describe(data) : "Feito.");
      router.refresh();
      return true;
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Erro inesperado");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mb-5 rounded-md border border-dashed p-3" open={empty}>
      <summary className="cursor-pointer text-sm font-medium text-gray-700">Novo sistema</summary>
      {/* Catálogo vazio: mostra a importação do Excel; depois só o "Novo sistema". */}
      {empty && (
      <div className="mt-4 rounded-md border bg-white p-3">
        <p className="text-sm font-medium text-gray-700">Importar do Excel</p>
        <p className="mb-2 text-xs text-gray-500">
          Cola as colunas Unidade, Colaborador e Função/Responsabilidade copiadas do Excel. Cada
          responsabilidade (separada por vírgula) passa a ser um sistema, com o colaborador como responsável.
          Os que já existem só atualizam unidade e responsável; o estado não muda.
        </p>
        <textarea
          value={table}
          onChange={(e) => {
            setTable(e.target.value);
            setPreview(null);
          }}
          rows={5}
          placeholder="Unidade⇥Colaborador⇥Função/Responsabilidade"
          className="w-full rounded-md border px-2 py-1 font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTable(DANAD_TABLE);
              setPreview(null);
            }}
            className="rounded-md border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Usar a tabela DANAD
          </button>
          <button
            type="button"
            disabled={!table.trim()}
            onClick={() => {
              const result = parseSystemsTable(table);
              setPreview(result);
              setChosen(new Set(result.items.filter((i) => !i.likelyNotSystem).map((i) => i.name)));
              setMessage("");
            }}
            className="rounded-md bg-brand-600 px-3 py-1 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Pré-visualizar
          </button>
        </div>

        {preview && (
          <div className="mt-3">
            {preview.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700">
                {w}
              </p>
            ))}
            {preview.items.length === 0 ? (
              <p className="text-sm text-gray-500">Não encontrei sistemas nesta tabela.</p>
            ) : (
              <>
                <p className="mb-1 text-xs text-gray-500">
                  Desmarca o que não é um sistema. As responsabilidades que parecem não o ser (assessoria,
                  conformidade, UX/UI...) vêm desmarcadas.
                </p>
                <ul className="grid max-h-72 gap-x-4 overflow-y-auto sm:grid-cols-2">
                  {preview.items.map((i) => {
                    const exists = existing.some((n) => n.toLowerCase() === i.name.toLowerCase());
                    return (
                      <li key={i.name}>
                        <label className="flex items-center gap-2 py-0.5 text-sm">
                          <input
                            type="checkbox"
                            checked={chosen.has(i.name)}
                            onChange={(e) =>
                              setChosen((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(i.name);
                                else next.delete(i.name);
                                return next;
                              })
                            }
                          />
                          <span>
                            {i.name}
                            <span className="text-xs text-gray-400">
                              {" "}
                              · {i.unitCode} · {i.ownerName}
                              {exists && " · já existe"}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={busy || chosen.size === 0}
                  onClick={async () => {
                    const items = preview.items.filter((i) => chosen.has(i.name));
                    if (
                      await run("/api/status/import", { items }, (d) => `${d.created} sistemas criados, ${d.updated} atualizados${d.broken ? `; LIGHT/PNB com um componente por ULS/serviço` : ""}.`)
                    ) {
                      setPreview(null);
                      setTable("");
                    }
                  }}
                  className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Importar {chosen.size} sistema{chosen.size === 1 ? "" : "s"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      )}

      <form
        className="mt-3 flex flex-wrap items-center gap-2 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run("/api/status/systems", form, () => `Sistema "${form.name}" criado.`)) {
            setForm({ ...form, name: "", ownerName: "" });
          }
        }}
      >
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Novo sistema"
          className="rounded-md border px-2 py-1"
        />
        <select
          value={form.unitCode}
          onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
          className="rounded-md border px-2 py-1"
          aria-label="Unidade"
        >
          {UNIT_ORDER.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
        <input
          value={form.ownerName}
          onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          placeholder="Responsável"
          className="rounded-md border px-2 py-1"
        />
        <select
          value={form.criticality}
          onChange={(e) => setForm({ ...form, criticality: e.target.value })}
          className="rounded-md border px-2 py-1"
          aria-label="Criticidade"
        >
          {Object.entries(CRITICALITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          className="rounded-md bg-brand-600 px-3 py-1 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          + Sistema
        </button>
      </form>
      {message && <p className={`mt-2 text-sm ${error ? "text-red-600" : "text-green-700"}`}>{message}</p>}
    </details>
  );
}
