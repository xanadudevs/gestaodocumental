// Agente de follow-up do Outlook: lê os Itens Enviados via Microsoft Graph e
// relança (encaminha com nota de lembrete) os emails que ficaram sem resposta
// há mais de N dias.
//
// Uso:
//   node scripts/outlook-followup.mjs            # dry-run: só lista o que faria
//   node scripts/outlook-followup.mjs --send     # envia mesmo os lembretes
//
// Variáveis (ver .env.example): MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID,
// MS_GRAPH_CLIENT_SECRET, MS_GRAPH_SENDER (a caixa de correio a vigiar).
// Permissões de aplicação necessárias: Mail.Read e Mail.Send.
// Opcionais: FOLLOWUP_DAYS (15), FOLLOWUP_LOOKBACK_DAYS (60),
// FOLLOWUP_MAX (20), FOLLOWUP_IGNORE_DOMAINS (lista separada por vírgulas),
// FOLLOWUP_MESSAGE (texto do lembrete).
const env = process.env;
const send = process.argv.includes("--send");
const days = Number(env.FOLLOWUP_DAYS ?? 15);
const lookbackDays = Number(env.FOLLOWUP_LOOKBACK_DAYS ?? 60);
const maxPerRun = Number(env.FOLLOWUP_MAX ?? 20);
const ignoreDomains = (env.FOLLOWUP_IGNORE_DOMAINS ?? "")
  .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
const note = env.FOLLOWUP_MESSAGE ??
  "Bom dia,<br><br>Volto a este assunto, que ainda não teve resposta. " +
  "Poderão dar-me novidades?<br><br>Obrigado.";

const need = ["MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET", "MS_GRAPH_SENDER"];
const missing = need.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Faltam variáveis: ${missing.join(", ")}`);
  process.exit(1);
}
const mailbox = env.MS_GRAPH_SENDER.toLowerCase();
const GRAPH = "https://graph.microsoft.com/v1.0";

async function token() {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.MS_GRAPH_CLIENT_ID,
        client_secret: env.MS_GRAPH_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) throw new Error(`Login Graph falhou: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

const accessToken = await token();

async function graph(path, init = {}) {
  const res = await fetch(path.startsWith("http") ? path : GRAPH + path, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`Graph ${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 202 || res.status === 204 ? null : res.json();
}

async function listAll(path) {
  const out = [];
  for (let url = path; url; ) {
    const page = await graph(url);
    out.push(...page.value);
    url = page["@odata.nextLink"];
  }
  return out;
}

const addr = (r) => r.emailAddress?.address?.toLowerCase() ?? "";
const iso = (d) => d.toISOString().replace(/\.\d+Z$/, "Z");
const now = Date.now();
const cutoff = new Date(now - days * 864e5);
const since = new Date(now - lookbackDays * 864e5);

// 1) Enviados na janela [hoje-lookback, hoje-days]
const sent = await listAll(
  `/users/${mailbox}/mailFolders/sentitems/messages?$top=100` +
  `&$select=id,subject,conversationId,sentDateTime,toRecipients,ccRecipients,from` +
  `&$filter=${encodeURIComponent(`sentDateTime ge ${iso(since)} and sentDateTime le ${iso(cutoff)}`)}`,
);

// 2) Um candidato por conversa (o enviado mais recente da janela)
const byConv = new Map();
for (const m of sent) {
  const cur = byConv.get(m.conversationId);
  if (!cur || m.sentDateTime > cur.sentDateTime) byConv.set(m.conversationId, m);
}

const todo = [];
for (const m of byConv.values()) {
  const to = m.toRecipients ?? [];
  if (!to.length) continue;
  if (to.every((r) => ignoreDomains.includes(addr(r).split("@")[1]))) continue;

  // 3) Há alguma mensagem na conversa depois do meu envio? (resposta de
  // terceiros OU um lembrete meu anterior - em ambos os casos não relançar.)
  const conv = await listAll(
    `/users/${mailbox}/messages?$top=50&$select=id,sentDateTime,receivedDateTime` +
    `&$filter=${encodeURIComponent(`conversationId eq '${m.conversationId}'`)}`,
  );
  const newer = conv.some((c) => (c.sentDateTime ?? c.receivedDateTime) > m.sentDateTime);
  if (!newer) todo.push(m);
}

todo.sort((a, b) => a.sentDateTime.localeCompare(b.sentDateTime));
console.log(`${sent.length} enviados analisados, ${todo.length} sem resposta há mais de ${days} dias.`);

let done = 0;
for (const m of todo.slice(0, maxPerRun)) {
  const age = Math.floor((now - new Date(m.sentDateTime)) / 864e5);
  const dest = m.toRecipients.map(addr).join(", ");
  console.log(`- [${age}d] "${m.subject}" -> ${dest}`);
  if (!send) continue;

  // Encaminha o original para os mesmos destinatários, com o lembrete no topo
  // (mantém o histórico citado).
  const draft = await graph(`/users/${mailbox}/messages/${m.id}/createForward`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await graph(`/users/${mailbox}/messages/${draft.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      subject: /^(re|fw|fwd):/i.test(m.subject) ? m.subject : `Re: ${m.subject}`,
      toRecipients: m.toRecipients,
      ccRecipients: m.ccRecipients ?? [],
      body: { contentType: "HTML", content: `${note}<br><br>${draft.body.content}` },
    }),
  });
  await graph(`/users/${mailbox}/messages/${draft.id}/send`, { method: "POST" });
  done++;
}

if (!send && todo.length) console.log("\nDry-run: nada enviado. Corre com --send para relançar.");
if (send) console.log(`\n${done} lembretes enviados.`);
if (todo.length > maxPerRun) console.log(`Limite por execução (${maxPerRun}) atingido; o resto fica para a próxima.`);
