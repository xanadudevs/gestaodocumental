import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import RoleForm from "@/components/RoleForm";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canManageUsers(session.user.role)) redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Utilizadores</h1>
      <p className="mb-4 text-sm text-gray-500">
        Só ADMIN e APPROVER podem ser escolhidos como aprovadores de documentos.
      </p>
      <table className="w-full rounded-md border bg-white text-sm">
        <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2">{u.name ?? "—"}</td>
              <td className="px-4 py-2 text-gray-500">{u.email}</td>
              <td className="px-4 py-2">
                <RoleForm userId={u.id} currentRole={u.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
