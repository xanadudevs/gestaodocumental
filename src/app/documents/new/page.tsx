import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const OPTIONS = [
  {
    href: "/documents/new/entrada",
    title: "Registar entrada",
    text: "Fatura (Direção Financeira), email, ofício ou documento externo (Conselho de Administração). Vai para o Diretor, que encaminha.",
  },
  {
    href: "/documents/new/informacao",
    title: "Informação",
    text: "Informação ao Conselho de Administração ou a outra direção, com o template SPMS. Sobe para parecer e aprovação.",
  },
  {
    href: "/documents/new/oficio",
    title: "Ofício",
    text: "Ofício para uma entidade externa, com o template SPMS. Sobe para parecer e aprovação.",
  },
];

export default async function NewDocumentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Novo documento</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <Link key={o.href} href={o.href} className="rounded-md border bg-white p-4 hover:border-brand-500">
            <p className="font-semibold text-brand-700">{o.title}</p>
            <p className="mt-1 text-sm text-gray-600">{o.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
