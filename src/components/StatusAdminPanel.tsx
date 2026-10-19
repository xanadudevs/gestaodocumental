"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UNIT_LABELS, UNIT_ORDER } from "@/lib/status";

export default function StatusAdminPanel({ empty }: { empty: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
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
      <summary className="cursor-pointer text-sm font-medium text-gray-700">Administração do catálogo</summary>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={busy}
          onClick={() =>
            run("/api/status/seed", undefined, (d) => {
              const created = (d.created as string[]).length;
              return created ? `${created} sistemas criados.` : "O catálogo já estava completo.";
            })
          }
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Carregar catálogo DANAD
        </button>
        <span className="text-xs text-gray-500">
          Cria os sistemas da tabela de responsáveis (cada um com Aplicação e Base de dados). Seguro de repetir.
        </span>
        <button
          disabled={busy}
          onClick={() =>
            confirm(
              'Nova ronda: todos os componentes voltam a "Por verificar" e a linha temporal é limpa. Continuar?'
            ) && run("/api/status/reset", undefined, (d) => `${d.reset} componentes por verificar.`)
          }
          className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Nova ronda (pôr tudo por verificar)
        </button>
      </div>

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
          <option value="HIGH">Crítico</option>
          <option value="MEDIUM">Importante</option>
          <option value="LOW">Normal</option>
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
