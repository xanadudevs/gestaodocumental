"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AttachmentUpload({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    const form = e.currentTarget;
    try {
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: new FormData(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao anexar");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <input name="files" type="file" multiple required className="text-sm" />
      <button
        type="submit"
        disabled={uploading}
        className="rounded-md border border-brand-600 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        {uploading ? "A anexar..." : "Anexar"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
