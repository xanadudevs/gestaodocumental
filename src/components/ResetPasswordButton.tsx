"use client";

import { useState } from "react";

export default function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    const password = prompt(`Nova password para ${name} (mín. 8 caracteres):`);
    if (!password) return;
    setMessage(null);
    const res = await fetch(`/api/users/${userId}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Password alterada" : data.error ?? "Erro ao alterar password");
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button onClick={reset} className="text-xs text-brand-700 hover:underline">
        Repor password
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </span>
  );
}
