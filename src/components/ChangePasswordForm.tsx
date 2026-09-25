"use client";

import { useState } from "react";

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.newPassword !== data.confirmPassword) {
      setError("As passwords novas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao alterar password");
      form.reset();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <input
        name="currentPassword"
        type="password"
        required
        placeholder="Password atual"
        autoComplete="current-password"
        className={inputClass}
      />
      <input
        name="newPassword"
        type="password"
        required
        minLength={8}
        placeholder="Nova password (mín. 8 caracteres)"
        autoComplete="new-password"
        className={inputClass}
      />
      <input
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        placeholder="Repetir nova password"
        autoComplete="new-password"
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-700">Password alterada.</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A alterar..." : "Alterar password"}
      </button>
    </form>
  );
}
