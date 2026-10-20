import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditLicense } from "@/lib/permissions";
import { LICENSE_PRODUCTS } from "@/lib/licenses";
import { loadLicenseFormData } from "@/lib/licenseFormData";
import LicenseRequestForm from "@/components/LicenseRequestForm";

export default async function EditLicensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const request = await prisma.licenseRequest.findUnique({ where: { id } });
  if (!request) notFound();
  if (!canEditLicense(session.user.role, request.status, request.coordinatorId, session.user.id)) {
    redirect(`/licencas/${id}`);
  }

  const { coordinations, coordinators, defaultCoordinator, usage } = await loadLicenseFormData();

  return (
    <div>
      <Link href={`/licencas/${id}`} className="text-sm text-gray-500 hover:text-brand-600">
        ← Pedido de {request.beneficiaryName}
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold">Editar licença</h1>
      <p className="mb-5 text-sm text-gray-500">
        As alterações ficam registadas no histórico do pedido. Se a licença já está aprovada ou atribuída, a
        nova combinação de software, tipo e unidade tem de caber na quota.
      </p>
      <LicenseRequestForm
        products={LICENSE_PRODUCTS}
        coordinations={coordinations}
        coordinators={coordinators}
        defaultCoordinator={defaultCoordinator}
        usage={usage}
        defaults={{ name: "", email: "" }}
        isLoggedIn
        edit={{
          id: request.id,
          initial: {
            product: request.product,
            licenseType: request.licenseType,
            coordinationId: request.coordinationId,
            coordinatorId: request.coordinatorId,
            beneficiaryName: request.beneficiaryName,
            beneficiaryEmail: request.beneficiaryEmail,
            jobTitle: request.jobTitle ?? "",
            superiorName: request.superiorName,
            superiorEmail: request.superiorEmail,
            project: request.project ?? "",
            justification: request.justification,
          },
        }}
      />
    </div>
  );
}
