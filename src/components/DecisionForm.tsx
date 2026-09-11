"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DecisionForm({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setError(null);
    if (decision === "REJECTED" && reason.trim().length === 0) {
      setError("Indica o motivo da rejeição.");
      return;
    }
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/documents/${documentId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registar decisão");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Decisão de aprovação</h2>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obrigatório se rejeitares)"
        rows={2}
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => decide("APPROVED")}
          disabled={submitting !== null}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {submitting === "APPROVED" ? "A aprovar..." : "Aprovar"}
        </button>
        <button
          onClick={() => decide("REJECTED")}
          disabled={submitting !== null}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting === "REJECTED" ? "A rejeitar..." : "Rejeitar"}
        </button>
      </div>
    </div>
  );
}
