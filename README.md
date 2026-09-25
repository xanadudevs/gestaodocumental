# Gestão Documental

Aplicação de gestão documental com fluxo de aprovação/rejeição, comentários e
histórico de decisões. Pensada para faturas, emails e outros documentos.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io/) + PostgreSQL grátis ([Supabase](https://supabase.com/))
- [NextAuth.js](https://next-auth.js.org/) com login Google e Microsoft (Azure AD)
- Ficheiros guardados no [Supabase Storage](https://supabase.com/storage) (bucket privado, só acessível via servidor autenticado)
- Deploy grátis na [Vercel](https://vercel.com/)

Tudo o que é usado aqui tem plano gratuito: Supabase (Postgres + Storage),
Google Cloud OAuth, Azure AD App registration e Vercel.

## Modelo de dados

- **User**: `role` = `ADMIN | APPROVER | USER`. O primeiro utilizador a
  entrar torna-se `ADMIN` automaticamente.
- **Document**: `type` (Fatura, Email, Contrato, Outro), `status`
  (`DRAFT → PENDING → APPROVED/REJECTED`), aprovador atribuído, ficheiro.
- **Comment**: comentários por documento.
- **AuditLog**: histórico de todas as ações (upload, submissão, aprovação,
  rejeição, comentários).

## Fluxo de aprovação

1. Um utilizador carrega um documento (fatura, email, etc.) — fica em
   **rascunho**, ou já escolhe logo um aprovador e fica **pendente**.
2. O aprovador (role `APPROVER` ou `ADMIN`) vê o documento em "Para eu
   aprovar" e pode **aprovar** ou **rejeitar** (com motivo obrigatório).
3. Se rejeitado, o autor pode corrigir e reenviar para aprovação.
4. Qualquer pessoa pode comentar em qualquer documento a qualquer momento.
5. Tudo fica registado no histórico do documento.

## 1. Criar o projeto Supabase (base de dados + storage)

1. Cria uma conta grátis em https://supabase.com/ e um novo projeto.
2. **Base de dados**: em *Project Settings → Database*, copia:
   - a *Connection pooling string* (porta `6543`) → vai para `DATABASE_URL`
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
   **"Criar / atualizar estrutura organizacional"** — cria as
   Direções/Unidades diretamente através da app, sem precisares de terminal
   nem de partilhar credenciais com ninguém. É seguro clicar mais do que
   uma vez (não duplica).

## Licenças (ex: Figma)

Menu **Licenças** para pedir e gerir licenças de software, hoje só Figma
(Full ou View). Fluxo:

1. Qualquer pessoa preenche **Pedir licença**: tipo (Full/View), nome e
   email profissional do beneficiário, função, superior hierárquico,
   coordenação, coordenador que aprova, projeto e justificação.
2. O coordenador recebe um **email** com a ligação e aprova ou rejeita
   (motivo obrigatório) **na própria aplicação**.
3. Ao aprovar, o sistema valida o **máximo de 22 licenças por Direção**
   (contam as licenças aprovadas e as já atribuídas, Full e View). A
   validação corre numa transação serializável, por isso duas aprovações
   em simultâneo nunca ultrapassam o limite. Também não deixa submeter
   pedidos novos com a Direção cheia, nem dois pedidos em curso para o
   mesmo email.
4. Depois de aprovado, segue **email para o Apoio Administrativo**
   (`LICENSE_SUPPORT_EMAIL`), com o beneficiário em cópia. O Apoio
   Administrativo dá o acesso e carrega em **"Acesso dado"** (o
   beneficiário é avisado por email).
5. Quando a licença deixa de ser precisa, o Apoio Administrativo carrega
   em **"Libertar licença"**, que liberta o lugar na Direção.

A página Licenças mostra as licenças de toda a gente, com filtros Full /
View e por estado, e a ocupação de cada Direção (X / 22).

Configuração:

- Em `/admin/users`, dá a role **SUPPORT** às pessoas do Apoio
  Administrativo e marca os coordenadores com o nível **Coordenação** (e
  a respetiva Unidade) — aparecem primeiro na lista de coordenadores do
  formulário. O coordenador tem de ter conta na app para aprovar.
- Define as variáveis `SMTP_*`, `MAIL_FROM` e `LICENSE_SUPPORT_EMAIL`
  (ver `.env.example`). Se algum email falhar, fica registado no histórico
  do pedido.
- O limite, os tipos que contam e novos produtos configuram-se em
  `src/lib/licenses.ts` (`LICENSE_PRODUCTS`).

## Próximos passos sugeridos

- Notificações por email quando um documento é submetido/aprovado/rejeitado
  (a infraestrutura de email já existe em `src/lib/mail.ts`).
- Importação automática de emails (ex: caixa de correio dedicada + regra de
  reencaminhamento, ou API do Gmail/Microsoft Graph) para criar documentos
  automaticamente a partir de anexos.
- Múltiplos aprovadores em sequência (workflow com mais do que um passo).
