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
      setMessage(`Estrutura organizacional pronta: ${data.total} unidades/direções.`);
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
        Cria as Direções/Unidades do organigrama (seguro de repetir - não duplica).
      </span>
      {message && (
        <span className={`text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>{message}</span>
      )}
    </div>
  );
}
