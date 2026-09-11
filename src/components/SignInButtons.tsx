"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";

export default function SignInButtons() {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  if (providers === null) {
    return <p className="text-sm text-gray-500">A carregar...</p>;
  }

  const list = Object.values(providers);

  if (list.length === 0) {
    return (
      <p className="max-w-sm text-sm text-red-600">
        Nenhum fornecedor de login configurado. Define GOOGLE_CLIENT_ID/SECRET ou
        AZURE_AD_CLIENT_ID/SECRET no ficheiro .env.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Entrar com {provider.name}
        </button>
      ))}
    </div>
  );
}
