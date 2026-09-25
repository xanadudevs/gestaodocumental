import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, formatUserOrg } from "@/lib/labels";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      role: true,
      level: true,
      passwordHash: true,
      unit: { select: { name: true } },
    },
  });
  if (!user) redirect("/login");

  const rows: [string, string][] = [
    ["Nome", user.name ?? "—"],
    ["Email", user.email ?? "—"],
    ["Utilizador", user.username ?? "—"],
    ["Role", ROLE_LABELS[user.role] ?? user.role],
    ["Unidade / Nível", formatUserOrg(user) || "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">A minha conta</h1>
      <dl className="grid gap-x-6 gap-y-2 rounded-md border bg-white p-5 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-gray-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {user.passwordHash && (
        <div className="rounded-md border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Alterar password</h2>
          <ChangePasswordForm />
        </div>
      )}
    </div>
  );
}
