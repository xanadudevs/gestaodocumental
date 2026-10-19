import Link from "next/link";

// Separadores entre as duas páginas do estado dos sistemas: submissão (onde
// se atualiza o estado) e relatório. Na página partilhada os links levam o token.
export default function StatusTabs({
  section,
  shared,
}: {
  section: "submissao" | "relatorio";
  shared?: { token: string };
}) {
  const qs = shared ? `?token=${encodeURIComponent(shared.token)}` : "";
  const base = shared ? "/estado-publico" : "/estado";
  const tabs = [
    { key: "submissao", label: "Submissão", href: `${base}${qs}` },
    { key: "relatorio", label: "Relatório", href: `${base}/relatorio${qs}` },
  ] as const;
  return (
    <nav className="mb-4 flex gap-1 border-b print:hidden" aria-label="Páginas do estado dos sistemas">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={section === t.key ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
            section === t.key
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
