"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import {
  COMPONENT_KIND_LABELS,
  CRITICALITY_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  UNIT_LABELS,
  UNIT_ORDER,
} from "@/lib/status";

export type BoardComponent = {
  id: string;
  name: string;
  kind: string;
  status: string;
  note: string | null;
  statusAt: string;
  statusByName: string | null;
  stale: boolean;
};
export type BoardSystem = {
  id: string;
  name: string;
  unitCode: string;
  ownerName: string | null;
  criticality: string;
  status: string;
  stale: boolean;
  components: BoardComponent[];
};

const ACTIONS = ["OK", "DEGRADED", "DOWN", "UNKNOWN"] as const;
const BUTTON_STYLES: Record<string, { on: string; off: string }> = {
  OK: { on: "bg-green-600 text-white", off: "text-green-700 hover:bg-green-50" },
  DEGRADED: { on: "bg-amber-500 text-white", off: "text-amber-700 hover:bg-amber-50" },
  DOWN: { on: "bg-red-600 text-white", off: "text-red-700 hover:bg-red-50" },
  UNKNOWN: { on: "bg-gray-500 text-white", off: "text-gray-600 hover:bg-gray-100" },
};

type Filter = "ALL" | "PROBLEMS" | "UNKNOWN" | "STALE";

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export default function StatusBoard({
  systems,
  isAdmin,
  apiBase = "/api/status",
  shared,
}: {
  systems: BoardSystem[];
  isAdmin: boolean;
  // Prefixo das rotas de atualização: o dos utilizadores com login, ou o do
  // link pessoal de um gestor (/api/status/owner/<token>).
  apiBase?: string;
  // Página partilhada (sem login): as atualizações levam o token.
  shared?: { token: string };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [unit, setUnit] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});


  async function call(key: string, url: string, method: string, body?: unknown) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(shared ? { "x-status-token": shared.token } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro ao guardar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setBusy(null);
    }
  }

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return systems.filter((s) => {
      if (unit && s.unitCode !== unit) return false;
      if (q && !`${s.name} ${s.ownerName ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "PROBLEMS") return s.status === "DOWN" || s.status === "DEGRADED";
      if (filter === "UNKNOWN") return s.status === "UNKNOWN";
      if (filter === "STALE") return s.stale;
      return true;
    });
  }, [systems, filter, unit, query]);

  const groups = UNIT_ORDER.concat(
    [...new Set(systems.map((s) => s.unitCode))].filter((u) => !UNIT_ORDER.includes(u))
  )
    .map((code) => ({ code, items: visible.filter((s) => s.unitCode === code) }))
    .filter((g) => g.items.length > 0);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`;
  const filters: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "PROBLEMS", label: "Com problemas" },
    { key: "UNKNOWN", label: "Por verificar" },
    { key: "STALE", label: "Desatualizados" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={chip(filter === f.key)}>
            {f.label}
          </button>
        ))}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-md border px-2 py-1 text-xs"
          aria-label="Unidade"
        >
          <option value="">Todas as unidades</option>
          {UNIT_ORDER.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar sistema ou responsável"
          className="min-w-[14rem] flex-1 rounded-md border px-2 py-1 text-xs"
        />
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {groups.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          {systems.length === 0 ? "Ainda não há sistemas no catálogo." : "Nenhum sistema com estes filtros."}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.code} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {UNIT_LABELS[g.code] ?? g.code} <span className="font-normal text-gray-400">({g.items.length})</span>
          </h2>
          <ul className="divide-y rounded-md border bg-white">
            {g.items.map((s) => {
              const expanded = open.has(s.id);
              return (
                <li key={s.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => toggle(s.id)}
                      className="flex min-w-[12rem] flex-1 items-center gap-3 text-left"
                      aria-expanded={expanded}
                    >
                      <span className={`h-3 w-3 shrink-0 rounded-full ${STATUS_STYLES[s.status].dot}`} />
                      <span>
                        <span className="font-medium">{s.name}</span>
                        {s.criticality === "HIGH" && (
                          <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">Crítico</span>
                        )}
                        {s.stale && (
                          <span
                            className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"
                            title="Estado confirmado há mais de 2 horas"
                          >
                            desatualizado
                          </span>
                        )}
                        <span className="block text-xs text-gray-500">
                          {s.ownerName ?? "Sem responsável"} · {s.components.length} componente
                          {s.components.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                    <StatusBadge status={s.status} />
                    <div className="flex overflow-hidden rounded-md border text-xs" role="group" aria-label={`Estado de ${s.name}`}>
                      {ACTIONS.map((a) => (
                        <button
                          key={a}
                          disabled={busy === s.id || s.components.length === 0}
                          onClick={() => call(s.id, `${apiBase}/systems/${s.id}/set-all`, "POST", { status: a })}
                          className={`px-2.5 py-1.5 font-medium disabled:opacity-50 ${
                            s.status === a && s.components.every((c) => c.status === a)
                              ? BUTTON_STYLES[a].on
                              : BUTTON_STYLES[a].off
                          }`}
                          title={
                            a === "OK"
                              ? "Confirmar que está tudo OK"
                              : a === "UNKNOWN"
                                ? "Voltar a pôr todos os componentes por verificar"
                                : `Marcar todos os componentes como ${STATUS_LABELS[a].toLowerCase()}`
                          }
                        >
                          {a === "OK" ? "Tudo OK" : STATUS_LABELS[a]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {s.components.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLES[c.status].dot}`} />
                          <span className="w-full sm:w-72">
                            {c.name}
                            <span className="block text-xs text-gray-400">{COMPONENT_KIND_LABELS[c.kind] ?? c.kind}</span>
                          </span>
                          <div className="flex overflow-hidden rounded-md border text-xs">
                            {ACTIONS.map((a) => (
                              <button
                                key={a}
                                disabled={busy === c.id}
                                onClick={() =>
                                  call(c.id, `${apiBase}/components/${c.id}`, "PATCH", {
                                    status: a,
                                    note: notes[c.id] ?? c.note ?? undefined,
                                  })
                                }
                                className={`px-2.5 py-1 disabled:opacity-50 ${c.status === a ? BUTTON_STYLES[a].on : BUTTON_STYLES[a].off}`}
                              >
                                {STATUS_LABELS[a]}
                              </button>
                            ))}
                          </div>
                          <input
                            key={`${c.id}-${c.note ?? ""}-${c.statusAt}`}
                            defaultValue={c.note ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                            onBlur={(e) => {
                              if (e.target.value !== (c.note ?? "") && c.status !== "UNKNOWN") {
                                call(c.id, `${apiBase}/components/${c.id}`, "PATCH", {
                                  status: c.status,
                                  note: e.target.value,
                                });
                              }
                            }}
                            placeholder="Nota (ex: previsão de resolução)"
                            className="min-w-[10rem] flex-1 rounded-md border px-2 py-1 text-xs"
                          />
                          <span className={`text-xs ${c.stale ? "text-amber-700" : "text-gray-400"}`}>
                            {c.status === "UNKNOWN" ? "por verificar" : ago(c.statusAt)}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => confirm(`Remover o componente "${c.name}"?`) && call(c.id, `/api/status/components/${c.id}`, "DELETE")}
                              className="text-xs text-gray-400 hover:text-red-600"
                              title="Remover componente"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      {isAdmin && (
                        <AdminSystemControls
                          system={s}
                          busy={busy === s.id}
                          onCall={(url, method, body) => call(s.id, url, method, body)}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AdminSystemControls({
  system,
  busy,
  onCall,
}: {
  system: BoardSystem;
  busy: boolean;
  onCall: (url: string, method: string, body?: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("SERVICE");
  const [batch, setBatch] = useState("");
  const [replace, setReplace] = useState(false);
  return (
    <div className="space-y-2 rounded-md bg-gray-50 p-2 text-xs">
      <label className="flex items-center gap-2 text-gray-600" title="Os sistemas críticos aparecem destacados na lista e no relatório">
        <span className="font-medium">Criticidade</span>
        <select
          value={system.criticality}
          disabled={busy}
          onChange={(e) => onCall(`/api/status/systems/${system.id}`, "PATCH", { criticality: e.target.value })}
          className="rounded-md border px-2 py-1"
        >
          {Object.entries(CRITICALITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <details>
        <summary className="cursor-pointer text-gray-500">Mais opções</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Novo componente (ex: API de integração)"
            className="min-w-[12rem] rounded-md border px-2 py-1"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border px-2 py-1" aria-label="Tipo">
            {Object.entries(COMPONENT_KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            disabled={busy || !name.trim()}
            onClick={() => {
              onCall(`/api/status/systems/${system.id}/components`, "POST", { name, kind });
              setName("");
            }}
            className="rounded-md bg-brand-600 px-2.5 py-1 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            + Componente
          </button>
          <div className="w-full">
            <textarea
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              rows={3}
              placeholder={"Vários componentes de uma vez, um por linha.\nUsa o tipo escolhido acima."}
              className="w-full rounded-md border px-2 py-1"
            />
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-gray-600">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Substituir os componentes atuais
              </label>
              <button
                disabled={busy || !batch.trim()}
                onClick={() => {
                  const names = batch.split(/\r?\n/).map((n) => n.trim()).filter(Boolean);
                  if (replace && !confirm(`Apagar os componentes atuais de "${system.name}" e criar ${names.length} novos?`)) return;
                  onCall(`/api/status/systems/${system.id}/components`, "POST", { names, kind, replace });
                  setBatch("");
                  setReplace(false);
                }}
                className="rounded-md bg-brand-600 px-2.5 py-1 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Criar em lote
              </button>
            </div>
          </div>
          <button
            disabled={busy}
            onClick={() => confirm(`Remover o sistema "${system.name}" e o seu histórico?`) && onCall(`/api/status/systems/${system.id}`, "DELETE")}
            className="ml-auto text-red-600 hover:underline"
          >
            Remover sistema
          </button>
        </div>
      </details>
    </div>
  );
}
