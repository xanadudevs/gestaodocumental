import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { getFlatUnits } from "@/lib/units";
import RoleForm from "@/components/RoleForm";
import UnitLevelForm from "@/components/UnitLevelForm";
import SeedUnitsButton from "@/components/SeedUnitsButton";
import CreateUserForm from "@/components/CreateUserForm";
import EditUserButton from "@/components/EditUserButton";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canManageUsers(session.user.role)) redirect("/dashboard");

  const [users, units] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getFlatUnits(),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Utilizadores</h1>
      <p className="mb-4 text-sm text-gray-500">
        Só Administradores e Aprovadores podem ser escolhidos como aprovadores de documentos. Nas
        licenças, aprova o coordenador indicado no pedido (convém ter nível Coordenação e a Unidade
        certa), e o Gestor de Licenças dá o acesso.
      </p>

      <SeedUnitsButton />
      <CreateUserForm units={units} />
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Email / Utilizador</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Unidade / Nível</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  <p>{u.name ?? "—"}</p>
                  <EditUserButton user={{ id: u.id, name: u.name, email: u.email, username: u.username }} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                  <p>{u.email ?? "—"}</p>
                  {u.username ? (
                    <p className="text-xs">@{u.username}</p>
                  ) : (
                    !u.passwordHash && <p className="text-xs text-gray-400">só Google/Microsoft</p>
                  )}
                </td>
                <td className="px-4 py-2">
                  <RoleForm userId={u.id} currentRole={u.role} />
                </td>
                <td className="px-4 py-2">
                  <UnitLevelForm
                    userId={u.id}
                    currentUnitId={u.unitId}
                    currentLevel={u.level}
                    units={units}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
