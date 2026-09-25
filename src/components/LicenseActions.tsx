"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "APPROVED" | "REJECTED" | "GRANT" | "REVOKE";

export default function LicenseActions({
  requestId,
  canDecide,
  canGrant,
  canRevoke,
}: {
  requestId: string;
  canDecide: boolean;
  canGrant: boolean;
  canRevoke: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<Action | null>(null);

  async function run(action: Action) {
    setError(null);
    if (action === "REJECTED" && !reason.trim()) {
      setError("Indica o motivo da rejeição.");
      return;
    }
    if (action === "REVOKE" && !confirm("Libertar esta licença? Deixa de contar para o limite da Direção.")) return;

    const url =
      action === "GRANT"
        ? `/api/licenses/${requestId}/grant`
        : action === "REVOKE"
          ? `/api/licenses/${requestId}/revoke`
          : `/api/licenses/${requestId}/decision`;
    setSubmitting(action);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "APPROVED" || action === "REJECTED"
            ? { decision: action, reason: reason.trim() || null }
            : { reason: reason.trim() || null }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registar ação");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(null);
    }
  }

  const button = "rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">
        {canDecide ? "Decisão do coordenador" : canGrant ? "Apoio Administrativo" : "Gestão da licença"}
      </h2>
      {(canDecide || canRevoke) && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={canDecide ? "Motivo (obrigatório se rejeitares)" : "Nota (opcional)"}
          rows={2}
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {canDecide && (
          <>
            <button
              onClick={() => run("APPROVED")}
              disabled={submitting !== null}
              className={`${button} bg-green-600 hover:bg-green-700`}
            >
              {submitting === "APPROVED" ? "A aprovar..." : "Aprovar"}
            </button>
            <button
              onClick={() => run("REJECTED")}
              disabled={submitting !== null}
              className={`${button} bg-red-600 hover:bg-red-700`}
            >
              {submitting === "REJECTED" ? "A rejeitar..." : "Rejeitar"}
            </button>
          </>
        )}
        {canGrant && (
          <button
            onClick={() => run("GRANT")}
            disabled={submitting !== null}
            className={`${button} bg-brand-600 hover:bg-brand-700`}
          >
            {submitting === "GRANT" ? "A registar..." : "Acesso dado"}
          </button>
        )}
        {canRevoke && (
          <button
            onClick={() => run("REVOKE")}
            disabled={submitting !== null}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {submitting === "REVOKE" ? "A libertar..." : "Libertar licença"}
          </button>
        )}
      </div>
    </div>
  );
}
