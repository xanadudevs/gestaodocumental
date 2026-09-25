"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copia a ligação:", window.location.href);
    }
  }

  return (
    <button
      onClick={copy}
      className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
    >
      {copied ? "Ligação copiada" : "Copiar ligação"}
    </button>
  );
}
