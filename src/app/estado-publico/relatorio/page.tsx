import { redirect } from "next/navigation";

// O relatório passou para a própria página de estado (mantém o token do link).
export default async function PublicStatusReportPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  redirect(token ? `/estado-publico?token=${encodeURIComponent(token)}` : "/estado-publico");
}
