// Corre `prisma db push` no build, repetindo quando a base de dados está
// temporariamente sem ligações livres (ex: pooler do Supabase em "session
// mode" com o pool cheio - EMAXCONNSESSION). Outros erros falham logo.
import { spawnSync } from "node:child_process";

const RETRYABLE = /EMAXCONNSESSION|max clients reached|too many clients|remaining connection slots/i;
const DELAYS_S = [5, 10, 20, 30, 45];

const command = process.env.DB_PUSH_COMMAND ?? "npx prisma db push --skip-generate";

for (let attempt = 0; ; attempt++) {
  const result = spawnSync(command, { shell: true, encoding: "utf8" });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status === 0) process.exit(0);

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!RETRYABLE.test(output) || attempt >= DELAYS_S.length) process.exit(result.status ?? 1);

  const delay = DELAYS_S[attempt];
  console.log(`\n[db-push] Base de dados sem ligações livres - nova tentativa em ${delay}s (${attempt + 2}/${DELAYS_S.length + 1})\n`);
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));
}
