import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate } from "@/lib/labels";
import StatusOverview from "@/components/StatusOverview";
import StatusTabs from "@/components/StatusTabs";

export default async function StatusReportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="text-xl font-semibold">Relatório do estado dos sistemas</h1>
      <p className="mb-3 text-sm text-gray-500">Gerado em {formatDate(new Date())}</p>
      <StatusTabs section="relatorio" />
      <StatusOverview />
    </div>
  );
}
