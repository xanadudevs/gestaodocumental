import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UploadForm from "@/components/UploadForm";

export default async function NewDocumentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const approvers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "APPROVER"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Novo documento</h1>
      <UploadForm approvers={approvers} />
    </div>
  );
}
