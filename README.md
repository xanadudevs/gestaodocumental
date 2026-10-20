# Gestão e Suporte DANAD

Aplicação de gestão e suporte da Direção de Arquitetura, Negócio e Análise
de Dados:

- **Documentos** — circuito documental da DANAD: entradas (faturas,
  emails, ofícios, documentos externos) que chegam ao Diretor e descem para
  coordenadores/gestores, pareceres que sobem, e informações/ofícios feitos
  com os templates Word da SPMS (ver secção [Documentos](#documentos)).
- **Licenças** — pedidos de licenças de software (Figma, Copilot, OpenAI) com
  aprovação do coordenador e limite por Direção (ver secção
  [Licenças](#licenças-ex-figma)).

- **Estado dos sistemas** — semáforo OK / degradado / em baixo para os
  sistemas da DANAD em situação de crise, com relatório (ver secção
  [Estado dos sistemas](#estado-dos-sistemas)).

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io/) + PostgreSQL grátis ([Supabase](https://supabase.com/))
- [NextAuth.js](https://next-auth.js.org/) com login Google e Microsoft (Azure AD)
- Ficheiros guardados no [Supabase Storage](https://supabase.com/storage) (bucket privado, só acessível via servidor autenticado)
- Deploy grátis na [Vercel](https://vercel.com/)

Tudo o que é usado aqui tem plano gratuito: Supabase (Postgres + Storage),
Google Cloud OAuth, Azure AD App registration e Vercel.

## Documentos

Cada documento tem uma **referência** `NN/DANAD - UNIDADE/AAAA`, ex:
`01/DANAD - UPACE/2026` (ou `01/DANAD/2026` quando é da Direção). A
numeração é por unidade e por ano, partilhada por todos os tipos de
documento. Os códigos das unidades estão em `src/lib/orgChart.ts`.

**Entradas** (menu Documentos → "Registar entrada"):

1. Regista-se a fatura (origem: Direção Financeira) ou o email, ofício ou
   documento externo (origem: Conselho de Administração), com anexos. A
   referência é da DANAD.
2. A entrada vai para a caixa do **Diretor** ("Na minha caixa").
3. O Diretor **encaminha** para um coordenador ou gestor, com despacho ou
   instruções. Quem recebe pode voltar a encaminhar.
4. Quem trata **dá parecer**: o parecer sobe para quem lhe encaminhou o
   documento.
5. O Diretor **conclui** a entrada.

**Informações e ofícios** (botões "+ Informação" e "+ Ofício"):

1. O autor preenche o formulário (os campos seguem os templates) e fica
   em rascunho, com a referência da unidade que emite.
2. **Submete** para apreciação do superior (sugere o coordenador da
   unidade, ou o Diretor).
3. Quem aprecia pode **dar parecer** e enviar para cima, **encaminhar** ou
   **devolver** ao autor para corrigir.
4. O **Diretor aprova**. O texto do despacho e os pareceres são
   preenchidos nas caixas "Parecer" e "Despacho/Deliberação" do Word.
5. O autor **marca como enviado** (ao CA, à outra direção ou à entidade).

Em qualquer momento, **"Descarregar Word"** gera o `.docx` a partir dos
templates SPMS (cabeçalho, rodapé e logótipo originais). Os templates estão
em `templates/` e são gerados a partir dos modelos Word originais com
`python3 scripts/build-templates.py <oficio.docx> <informacao.docx>`.

Todos veem todos os documentos. Só quem tem o documento na caixa pode agir
sobre ele, e só o Diretor (nível Direção) ou um ADMIN aprova ou conclui.
Os documentos antigos (sem referência) continuam com o fluxo simples de
aprovação.

## Estado dos sistemas

Menu **Estado dos sistemas** (`/estado`). Cada sistema (RNU, SICO, Portal
Scubo, Data Lake, ...) tem **componentes** — por omissão *Aplicação*,
*Base de dados* e *Serviços / API*, e o Administrador acrescenta outros (serviço/API,
integração, infraestrutura). Cada componente está em **OK**, **Degradado**,
**Em baixo** ou **Por verificar**; o estado do sistema é o pior dos seus
componentes.

- Qualquer utilizador autenticado atualiza estados: "Tudo OK" / "Degradado"
  / "Em baixo" por sistema num clique, ou componente a componente (com
  nota, ex: previsão de resolução). Fica registado quem e quando.
- Estados confirmados há mais de 2 horas aparecem como *desatualizados*.
- O número vermelho no menu é o total de sistemas com problemas.
- **Duas páginas**, com separadores "Submissão" e "Relatório":
  - **Submissão** (`/estado`): onde se atualiza o estado de cada sistema e
    componente, com um resumo curto (% OK e contagens) no topo.
  - **Relatório** (`/estado/relatorio`): o resumo (% OK, contagens), a tabela
    por unidade e a lista "Prioridade" com os sistemas que não estão OK
    **ordenados por impacto** (criticidade × gravidade: primeiro os de
    criticidade elevada em baixo, depois os normais em baixo e os elevados
    degradados, ...), com os componentes afetados e o responsável. "Copiar como
    texto" (para email/chat) e imprimir/PDF. `GET /api/status/summary`
    devolve o mesmo em JSON.
- **Páginas partilhadas** (`/estado-publico?token=SPMS%23123` para a
  submissão e `/estado-publico/relatorio?token=SPMS%23123` para o relatório): **sem login**,
  protegida por token (muda-se com `STATUS_PUBLIC_TOKEN`; o `#` vai como
  `%23` no link, ou escreve-se o token no formulário da página). Quem tem o
  link vê **e atualiza** o estado de todos os sistemas e componentes. Atualizam-se sozinhas de minuto a minuto.
  Não há contas nem links por pessoa: tratar o link como uma password.
- **Vários componentes de uma vez**: nos sistemas com muitos componentes (LIGHT por
  ULS, PNB por serviço) cada componente tem uma caixa de seleção, com
  "Selecionar todos", filtro por nome e botões para marcar os selecionados como
  OK, Degradado, Em baixo ou Por verificar (com nota opcional).
- **Por verificar**: cada sistema e cada componente tem um botão "Por verificar"
  para voltar a pedir confirmação (útil no início de uma crise ou de uma ronda).
- **Administrador**: no painel "Novo sistema" cria sistemas. Se o catálogo
  estiver vazio, aparece também a importação do Excel (cola as colunas
  Unidade, Colaborador e Função/Responsabilidade; cada responsabilidade
  passa a ser um sistema, com o colaborador como responsável, e há
  pré-visualização). Dentro de cada sistema define a **Criticidade** (Elevado, Normal ou Baixo) e, em
  "Mais opções", acrescenta componentes (também em lote, um por linha) ou
  remove o sistema. O **LIGHT** (uma ULS por componente, 46) e o **PNB** (um
  serviço por componente, 20) ficam assim logo ao importar; as listas estão em
  `src/lib/statusBreakdown.ts`.

## 1. Criar o projeto Supabase (base de dados + storage)

1. Cria uma conta grátis em https://supabase.com/ e um novo projeto.
2. **Base de dados**: em *Project Settings → Database*, copia:
   - a *Connection pooling string* (porta `6543`, "transaction mode") → vai
     para `DATABASE_URL`, acrescentando `?pgbouncer=true&connection_limit=1`.
     Não uses a porta `5432` aqui: em "session mode" as funções da Vercel
     esgotam as 15 ligações do Supabase e o build falha com
     `EMAXCONNSESSION` (o build já repete o `db push` algumas vezes antes
     de desistir)
   - a *Connection string* direta (porta `5432`) → vai para `DIRECT_URL`
3. **Storage**: em *Storage*, cria um bucket **privado** chamado `documents`.
4. **Chave de serviço**: em *Project Settings → API*, copia o `service_role`
   secret → vai para `SUPABASE_SERVICE_ROLE_KEY`, e o *Project URL* → vai
   para `SUPABASE_URL`.

> A `service_role` key tem acesso total ao projeto — nunca a exponhas no
> browser. Só é usada no servidor (rotas API), nunca em código do lado do
> cliente.

### Evitar que o Supabase pause o projeto

Os projetos gratuitos do Supabase pausam após cerca de 7 dias sem
atividade (e com o projeto pausado a app e o build falham). O
`vercel.json` define um cron da Vercel que chama `/api/health` todos os
dias às 06:00 UTC; essa rota faz uma consulta à base de dados, o que conta
como atividade. Os crons da Vercel só correm no deploy de **produção** e o
plano gratuito permite um por dia. Os resultados aparecem em Vercel →
Settings → Cron Jobs. Se o projeto já estiver pausado, é preciso restaurá-lo
uma vez no Supabase ("Restore project").

Alternativa/reforço: um monitor externo gratuito (ex: UptimeRobot) a chamar
`https://<o-teu-dominio>/api/health` de 5 em 5 minutos, que também avisa
quando a app ou a base de dados deixam de responder.

## 2. Configurar login

Há duas formas de login, podes usar uma ou ambas:

### Opção rápida: utilizador/password (sem OAuth)

Útil para acesso imediato sem depender de contas Google/Microsoft. Define
duas variáveis de ambiente (`.env` local ou Vercel → Environment Variables):

```bash
BOOTSTRAP_USERNAME="o-username-que-quiseres"
BOOTSTRAP_PASSWORD_HASH="<hash gerado abaixo>"
```

Gera o hash da password (nunca guardes a password em texto simples):

```bash
node -e "console.log(require('bcryptjs').hashSync('A_TUA_PASSWORD', 10))"
```

> Num ficheiro `.env` **local**, escapa cada `$` do hash como `\$` (o
> carregador de env do Next.js tenta expandi-los como variáveis), ex:
> `BOOTSTRAP_PASSWORD_HASH="\$2b\$10\$abcd..."`. Na Vercel, cola o hash tal
> como o comando o gerou, sem escapar nada — lá não há esse problema.

Na primeira vez que fizeres login com esse utilizador/password na página
`/login`, a conta é criada automaticamente como `ADMIN`.

Esta conta serve também de **acesso de emergência**: entrar com a
password das variáveis de ambiente funciona sempre e volta a pôr essa
password e a role `ADMIN` na conta. Se ficares sem acesso, gera um novo
hash, muda `BOOTSTRAP_PASSWORD_HASH` na Vercel e faz **Redeploy**.

Se o login falhar com "erro no servidor ou na base de dados", abre
`/api/health`: mostra se a app consegue falar com a base de dados e se a
configuração principal está certa (porta da `DATABASE_URL`, `pgbouncer`,
`NEXTAUTH_URL`, etc. — sem segredos).

### Google / Microsoft (OAuth, grátis)

**Google** — https://console.cloud.google.com/apis/credentials
- Criar credenciais OAuth 2.0 (tipo "Aplicação Web")
- Redirect URI local: `http://localhost:3000/api/auth/callback/google`
- Redirect URI produção: `https://<o-teu-dominio>/api/auth/callback/google`
- Copiar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`

**Microsoft** — https://portal.azure.com → App registrations → New registration
- Redirect URI local: `http://localhost:3000/api/auth/callback/azure-ad`
- Redirect URI produção: `https://<o-teu-dominio>/api/auth/callback/azure-ad`
- "Accounts in any organizational directory and personal Microsoft accounts"
- Copiar `AZURE_AD_CLIENT_ID`, criar um client secret em
  "Certificates & secrets" e copiar `AZURE_AD_CLIENT_SECRET`.
  `AZURE_AD_TENANT_ID` pode ficar `common`.

## 3. Correr localmente

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Criar o `.env` a partir do exemplo e preencher com os valores do
   Supabase e do(s) fornecedor(es) de login:

   ```bash
   cp .env.example .env
   ```

3. Gerar um `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. Aplicar o schema à base de dados Supabase (também corre sozinho a cada
   `npm run build`, mas útil para desenvolvimento local):

   ```bash
   npm run db:push
   ```

5. Criar a estrutura organizacional (Direções/Unidades) — em alternativa,
   podes fazer isto mais tarde com um clique em `/admin/users` (ver secção
   de deploy):

   ```bash
   npm run db:seed
   ```

6. Arrancar o servidor:

   ```bash
   npm run dev
   ```

7. Abrir http://localhost:3000 e entrar com Google/Microsoft. O primeiro
   utilizador torna-se ADMIN automaticamente — depois pode, em
   `/admin/users`:
   - criar utilizadores com **"+ Novo utilizador"** (nome, email, utilizador,
     password inicial, role, unidade e nível). Entram na página de login
     com o utilizador **ou** o email; cada pessoa pode mudar a password em
     "A minha conta" (clicar no nome, no topo)
   - **"Editar"** qualquer utilizador: nome, email, utilizador e nova
     password (também serve para dar login por password a quem só entrava
     por Google/Microsoft)
   - promover outros a `APPROVER` (só ADMIN e APPROVER podem ser
     escolhidos como aprovadores de documentos)
   - atribuir a cada pessoa uma Unidade/Direção e um Nível (Técnico,
     Gestão, Coordenação, Direção, Conselho) — é só informação
     organizacional, mostrada ao escolher um aprovador; não restringe quem
     pode aprovar (a escolha do aprovador continua livre)

## 4. Deploy na Vercel (grátis)

1. Cria uma conta em https://vercel.com/ e liga-a à tua conta GitHub.
2. "Add New… → Project" e escolhe o repositório `gestaodocumental`.
3. Em *Environment Variables*, adiciona todas as variáveis do `.env`
   (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`,
   `NEXTAUTH_SECRET`, `BOOTSTRAP_USERNAME`/`BOOTSTRAP_PASSWORD_HASH` se
   quiseres o login por password, e as credenciais Google/Microsoft se
   as tiveres).
4. Define `NEXTAUTH_URL` com o domínio final que a Vercel te der (ex:
   `https://gestaodocumental.vercel.app`).
5. Volta ao Google Cloud Console / Azure Portal e adiciona esse domínio
   aos redirect URIs autorizados (ver secção 2).
6. Deploy. O comando de build já corre `prisma generate && prisma db push
   && next build` automaticamente (definido em `package.json`) — o schema
   da base de dados fica sempre sincronizado a cada deploy, sem precisares
   de correr nada manualmente.
7. Depois do primeiro deploy: entra na app, faz login (o primeiro
   utilizador torna-se ADMIN), vai a `/admin/users` e clica em
   **"Criar / atualizar estrutura organizacional"** — aplica a estrutura
   definida em `src/lib/orgChart.ts`: a DANAD e as suas coordenações (PACE,
   UIA, UID, URN), cada uma com o seu coordenador. Unidades que não fazem
   parte dela são removidas (quem lá estava fica sem unidade); os
   coordenadores que ainda não existem são criados sem login — define-lhes
   utilizador e password em "Editar". É seguro clicar mais do que uma vez.

## Licenças (Figma, Copilot, OpenAI)

Menu **Licenças** para pedir e gerir licenças de software: **Figma** (Full ou
View, máximo de 22 por Direção), **Copilot** e **OpenAI** (licença única, com
quota por unidade). Os produtos e os limites estão em `src/lib/licenses.ts`.

| | Copilot | OpenAI | Total |
|---|---|---|---|
| Direção (Diretor 1 + Assessoria 1) | 2 | – | 2 |
| UPACE, UID, UIA, URN (cada) | 2 | 3 | 5 |
| Reserva (sem atribuir) | – | 3 | 3 |
| **Total** | **10** | **15** | **25** |

A quota conta-se por **coordenação**: o pedido só é aceite (ao pedir e ao
aprovar) se a unidade ainda tiver licenças livres, e as 3 licenças OpenAI de
reserva só se atribuem alterando as quotas. Os pedidos do Diretor e da
Assessoria fazem-se escolhendo a própria Direção na lista de coordenações.
Fluxo:

1. Qualquer pessoa preenche **Pedir licença** em `/licencas/nova` —
   **não precisa de login** (há um atalho na página de login). Escolhe
   primeiro a coordenação e o respetivo coordenador aparece logo
   preenchido; depois o software e o tipo (Full/View no Figma), nome e email profissional do
   beneficiário, função, gestor de projeto, projeto e justificação.
2. O coordenador vê o pedido em **Licenças → Para eu aprovar** (com um
   contador no menu) e aprova ou rejeita (motivo obrigatório) **na
   própria aplicação**. Quem pediu pode copiar a ligação do pedido para a
   enviar ao coordenador (Teams, etc.).
3. Ao aprovar, o sistema valida o **limite** do produto (Figma: máximo de 22
   por Direção; Copilot e OpenAI: quota da coordenação; contam as licenças
   aprovadas e as já atribuídas). A
   validação corre numa transação serializável, por isso duas aprovações
   em simultâneo nunca ultrapassam o limite. Também não deixa submeter
   pedidos novos com a Direção cheia, nem dois pedidos em curso para o
   mesmo email.
4. Depois de aprovado, o pedido aparece ao **Apoio Administrativo** em
   **Licenças → Para dar acesso** (também com contador no menu), que dá o
   acesso e carrega em **"Acesso dado"**.
5. Quando a licença deixa de ser precisa, o Apoio Administrativo carrega
   em **"Libertar licença"**, que liberta o lugar na Direção.

Um **Administrador** pode apagar pedidos (ex: pedidos de teste): na lista
de Licenças escolhe-os com as caixas de seleção e carrega em "Apagar
selecionados". O histórico de cada pedido é apagado com ele.

Todos os pedidos são da DANAD: a Direção de cada pedido é sempre a raiz do
organigrama. Aplicar a estrutura organizacional corrige pedidos antigos que
tenham ficado associados a outra unidade de topo.

A página Licenças mostra as licenças de toda a gente, com filtros por
software, tipo (Full / View / Licença) e estado, e a ocupação de cada Direção
por produto (ex: 3 / 22 no Figma).

Configuração:

- Em `/admin/users`, dá a role **SUPPORT** às pessoas do Apoio
  Administrativo e marca os coordenadores com o nível **Coordenação** (e
  a respetiva Unidade) — aparecem primeiro na lista de coordenadores do
  formulário. O coordenador tem de ter conta na app para aprovar.
- **Emails (opcional, desligado por omissão)** — a app funciona sem
  emails, só com as notificações dentro da aplicação. Se um dia quiseres
  emails (ao coordenador, ao Apoio Administrativo via
  `LICENSE_SUPPORT_EMAIL` e ao beneficiário), basta configurar uma destas
  opções (ver `.env.example`); falhas de envio ficam no histórico do
  pedido:
  - **Office 365 (Microsoft Graph)** — em https://portal.azure.com →
    *App registrations → New registration* (só contas desta
    organização); em *API permissions* adiciona *Microsoft Graph →
    Application permissions → Mail.Send* e pede a um administrador do
    tenant para dar *Grant admin consent*; em *Certificates & secrets*
    cria um client secret. Preenche `MS_GRAPH_TENANT_ID` (o *Directory
    (tenant) ID*, não `common`), `MS_GRAPH_CLIENT_ID`,
    `MS_GRAPH_CLIENT_SECRET` e `MS_GRAPH_SENDER` (a caixa que envia). Por
    segurança, o administrador pode limitar a app a essa única caixa com
    uma *Application Access Policy* do Exchange
    (`New-ApplicationAccessPolicy -AccessRight RestrictAccess ...`).
  - **SMTP** (Gmail com palavra-passe de aplicação, Brevo, …) — variáveis
    `SMTP_*` e `MAIL_FROM`.
- O limite, os tipos que contam e novos produtos configuram-se em
  `src/lib/licenses.ts` (`LICENSE_PRODUCTS`).

## Próximos passos sugeridos

- Notificações por email quando um documento é submetido/aprovado/rejeitado
  (a infraestrutura de email já existe em `src/lib/mail.ts`).
- Importação automática de emails (ex: caixa de correio dedicada + regra de
  reencaminhamento, ou API do Gmail/Microsoft Graph) para criar documentos
  automaticamente a partir de anexos.
- Múltiplos aprovadores em sequência (workflow com mais do que um passo).
