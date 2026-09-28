import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFlatUnits } from "@/lib/units";
import { LICENSE_PRODUCTS, getDirectionUsage, withDirections } from "@/lib/licenses";
import { configuredCoordinator, unitLabel } from "@/lib/orgChart";
import { Level, Role } from "@/lib/enums";
import LicenseRequestForm from "@/components/LicenseRequestForm";

// Página pública: qualquer pessoa pode pedir uma licença sem login. Só a
// aprovação e a gestão das licenças exigem conta.
export default async function NewLicenseRequestPage() {
  const session = await getServerSession(authOptions);

  const [units, coordinators, usage, me] = await Promise.all([
    getFlatUnits(),
    prisma.user.findMany({
      where: {
        OR: [
          { level: { in: [Level.COORDENACAO, Level.DIRECAO] } },
          { role: { in: [Role.ADMIN, Role.APPROVER] } },
        ],
      },
      // Sem emails: a página é pública.
      select: { id: true, name: true, level: true, unitId: true, unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    getDirectionUsage(prisma),
    session
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } })
      : null,
  ]);

  const unitsWithDirection = withDirections(units);
  const coordinations = unitsWithDirection.map((u) => ({
    id: u.id,
    label: unitLabel(u.name),
    depth: u.depth,
    direction: u.direction,
  }));

  // Coordenador de cada coordenação: o definido no organigrama (se estiver
  // nessa unidade); senão, quem tem nível Coordenação nessa unidade (na
  // Direção, nível Direção).
  const defaultCoordinator: Record<string, string> = {};
  for (const unit of unitsWithDirection) {
    const inUnit = coordinators.filter((c) => c.unitId === unit.id);
    const named = configuredCoordinator(unit.name)?.toLowerCase();
    const level = unit.depth === 0 ? Level.DIRECAO : Level.COORDENACAO;
    const match =
      (named && inUnit.find((c) => c.name?.toLowerCase() === named)) || inUnit.find((c) => c.level === level);
    if (match) defaultCoordinator[unit.id] = match.id;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Pedir licença</h1>
      <p className="mb-5 text-sm text-gray-500">
        Escolhe a coordenação — o respetivo coordenador aprova o pedido nesta aplicação. Depois de aprovado, o
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
          coordinators={coordinators.map(({ unitId: _unitId, ...c }) => c)}
          defaultCoordinator={defaultCoordinator}
          usage={usage}
          defaults={{ name: me?.name ?? "", email: me?.email ?? "" }}
          isLoggedIn={!!session}
        />
      )}
    </div>
  );
}
