import { redirect } from "next/navigation";

// O relatório passou para a própria página de estado.
export default function StatusReportPage() {
  redirect("/estado");
}
