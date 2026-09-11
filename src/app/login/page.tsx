import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignInButtons from "@/components/SignInButtons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-700">Gestão Documental</h1>
        <p className="mt-1 text-sm text-gray-500">
          Faturas, emails e documentos com fluxo de aprovação e comentários.
        </p>
      </div>
      <SignInButtons />
    </div>
  );
}
