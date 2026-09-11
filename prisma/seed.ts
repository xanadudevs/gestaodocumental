import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed vazio: os utilizadores são criados automaticamente no primeiro login (OAuth).");
  console.log("O primeiro utilizador a entrar torna-se ADMIN automaticamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
