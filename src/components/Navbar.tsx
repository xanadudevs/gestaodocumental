import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageLicenses, canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LicenseStatus } from "@/lib/enums";
import SignOutButton from "@/components/SignOutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  // Sem emails, é este contador que avisa o coordenador de pedidos para
  // aprovar e o Apoio Administrativo de pedidos para dar acesso.
  const pendingLicenses = await prisma.licenseRequest.count({
    where: {
      OR: [
        { status: LicenseStatus.PENDING, coordinatorId: session.user.id },
        ...(canManageLicenses(session.user.role) ? [{ status: LicenseStatus.APPROVED }] : []),
      ],
    },
  });

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-brand-700">
            Gestão e Suporte DANAD
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-brand-600">
              Documentos
            </Link>
            <Link href="/documents/new" className="hover:text-brand-600">
              Novo documento
            </Link>
            <Link href="/licencas" className="flex items-center gap-1 hover:text-brand-600">
              Licenças
              {pendingLicenses > 0 && (
                <span
                  className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white"
                  title="Pedidos à espera de ti"
                >
                  {pendingLicenses}
                </span>
              )}
            </Link>
            {canManageUsers(session.user.role) && (
              <Link href="/admin/users" className="hover:text-brand-600">
                Utilizadores
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {session.user.name ?? session.user.email}{" "}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs uppercase text-gray-500">
              {session.user.role}
            </span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
