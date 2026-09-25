import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFlatUnits } from "@/lib/units";
import { LICENSE_PRODUCTS, getDirectionUsage, withDirections } from "@/lib/licenses";
import { Level, Role } from "@/lib/enums";
import LicenseRequestForm from "@/components/LicenseRequestForm";

export default async function NewLicenseRequestPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [units, coordinators, usage, me] = await Promise.all([
    getFlatUnits(),
    prisma.user.findMany({
      where: {
        OR: [
          { level: { in: [Level.COORDENACAO, Level.DIRECAO] } },
          { role: { in: [Role.ADMIN, Role.APPROVER] } },
        ],
      },
      select: { id: true, name: true, email: true, level: true, unitId: true, unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    getDirectionUsage(prisma),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
  ]);

  const coordinations = withDirections(units);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Pedir licença</h1>
      <p className="mb-5 text-sm text-gray-500">
        O coordenador indicado aprova o pedido aqui na aplicação (em Licenças → Para eu aprovar). Depois de
        aprovado, o pedido passa para o Apoio Administrativo, que dá o acesso.
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
          usage={usage}
          defaults={{ name: me?.name ?? "", email: me?.email ?? "" }}
        />
      )}
    </div>
  );
}
