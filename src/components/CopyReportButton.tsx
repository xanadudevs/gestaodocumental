"use client";

import { useState } from "react";

export default function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copia o relatório:", text);
        }
      }}
      className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      {copied ? "Copiado ✓" : "Copiar como texto"}
    </button>
  );
}
