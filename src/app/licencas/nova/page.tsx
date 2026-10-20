import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LICENSE_PRODUCTS } from "@/lib/licenses";
import { loadLicenseFormData } from "@/lib/licenseFormData";
import LicenseRequestForm from "@/components/LicenseRequestForm";

// Página pública: qualquer pessoa pode pedir uma licença sem login. Só a
// aprovação e a gestão das licenças exigem conta.
export default async function NewLicenseRequestPage() {
  const session = await getServerSession(authOptions);

  const [{ coordinations, coordinators, defaultCoordinator, usage }, me] = await Promise.all([
    loadLicenseFormData(),
    session
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } })
      : null,
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Pedir licença</h1>
      <p className="mb-5 text-sm text-gray-500">
        Escolhe a unidade (a Direção ou uma das coordenações) — o respetivo coordenador aprova o pedido nesta aplicação. Depois de aprovado, o
        Gestor de Licenças dá o acesso.
        {!session && (
          <>
            {" "}
            Não precisas de conta para pedir.{" "}
            <Link href="/login" className="text-brand-700 hover:underline">
              Entrar
            </Link>{" "}
            (coordenadores e gestão).
          </>
        )}
      </p>
      {coordinations.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          A estrutura organizacional ainda não foi criada. Um administrador tem de a criar em Utilizadores.
        </p>
      ) : (
        <LicenseRequestForm
          products={LICENSE_PRODUCTS}
          coordinations={coordinations}
          coordinators={coordinators}
          defaultCoordinator={defaultCoordinator}
          usage={usage}
          defaults={{ name: me?.name ?? "", email: me?.email ?? "" }}
          isLoggedIn={!!session}
        />
      )}
    </div>
  );
}
