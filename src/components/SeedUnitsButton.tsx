"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SeedUnitsButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/seed-units", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar estrutura organizacional");
      const parts = [`Estrutura pronta: ${data.total} unidades`];
      if (data.removed) parts.push(`${data.removed} removidas`);
      if (data.coordinatorsCreated?.length) {
        parts.push(`coordenadores criados (definir login em "Editar"): ${data.coordinatorsCreated.join(", ")}`);
      }
      if (data.coordinatorsUpdated?.length) parts.push(`coordenadores associados: ${data.coordinatorsUpdated.join(", ")}`);
      if (data.kept?.length) parts.push(`mantidas por terem pedidos de licença: ${data.kept.join(", ")}`);
      setMessage(parts.join(" · ") + ".");
      setStatus("done");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3">
      <button
        onClick={run}
        disabled={status === "loading"}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "loading" ? "A criar..." : "Criar / atualizar estrutura organizacional"}
      </button>
      <span className="text-xs text-gray-500">
        DANAD e as suas coordenações (PACE, UIA, UID, URN) com os respetivos coordenadores. Remove as
        unidades que não fazem parte dela. Seguro de repetir.
      </span>
      {message && (
        <span className={`text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>{message}</span>
      )}
    </div>
  );
}
