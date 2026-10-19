import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import StatusReportView from "@/components/StatusReportView";

export default async function StatusReportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <StatusReportView backHref="/estado" />;
}
