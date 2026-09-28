# Gestão e Suporte DANAD

Aplicação de gestão e suporte da Direção de Arquitetura, Negócio e Análise
de Dados:

- **Documentos** — circuito documental da DANAD: entradas (faturas,
  emails, ofícios, documentos externos) que chegam ao Diretor e descem para
  coordenadores/gestores, pareceres que sobem, e informações/ofícios feitos
  com os templates Word da SPMS (ver secção [Documentos](#documentos)).
- **Licenças** — pedidos de licenças de software (ex: Figma) com
  aprovação do coordenador e limite por Direção (ver secção
  [Licenças](#licenças-ex-figma)).

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

## Licenças (ex: Figma)

Menu **Licenças** para pedir e gerir licenças de software, hoje só Figma
(Full ou View). Fluxo:

1. Qualquer pessoa preenche **Pedir licença** em `/licencas/nova` —
   **não precisa de login** (há um atalho na página de login). Escolhe
   primeiro a coordenação e o respetivo coordenador aparece logo
   preenchido; depois o tipo (Full/View), nome e email profissional do
   beneficiário, função, gestor de projeto, projeto e justificação.
2. O coordenador vê o pedido em **Licenças → Para eu aprovar** (com um
   contador no menu) e aprova ou rejeita (motivo obrigatório) **na
   própria aplicação**. Quem pediu pode copiar a ligação do pedido para a
   enviar ao coordenador (Teams, etc.).
3. Ao aprovar, o sistema valida o **máximo de 22 licenças por Direção**
   (contam as licenças aprovadas e as já atribuídas, Full e View). A
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

A página Licenças mostra as licenças de toda a gente, com filtros Full /
View e por estado, e a ocupação de cada Direção (X / 22).

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
