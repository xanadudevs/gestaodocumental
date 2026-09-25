"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function CredentialsSignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (res?.error) {
      // "ServerError" = LOGIN_SERVER_ERROR em src/lib/auth.ts
      setError(
        res.error === "ServerError"
          ? "Não foi possível verificar o login (erro no servidor ou na base de dados). Tenta daqui a pouco; se continuar, abre /api/health."
          : "Utilizador ou password incorretos.",
      );
      setSubmitting(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-64 flex-col gap-2">
      <input
        type="text"
        placeholder="Utilizador ou email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {submitting ? "A entrar..." : "Entrar"}
      </button>
    </form>
  );
}
