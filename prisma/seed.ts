import { PrismaClient } from "@prisma/client";
import { upsertOrgChart } from "../src/lib/orgChart";

const prisma = new PrismaClient();

async function main() {
  console.log("A criar/atualizar a estrutura organizacional...");
  const total = await upsertOrgChart(prisma);
  console.log(`Estrutura organizacional pronta: ${total} unidades/direções.`);

  console.log(
    "Os utilizadores são criados automaticamente no primeiro login (OAuth). " +
      "O primeiro a entrar torna-se ADMIN automaticamente. Atribui unidade/nível em /admin/users."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
