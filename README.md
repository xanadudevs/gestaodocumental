# Gestão Documental

Aplicação de gestão documental com fluxo de aprovação/rejeição, comentários e
histórico de decisões. Pensada para faturas, emails e outros documentos.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io/) + SQLite local (fácil migrar para PostgreSQL grátis — Neon/Supabase)
- [NextAuth.js](https://next-auth.js.org/) com login Google e Microsoft (Azure AD)
- Ficheiros guardados localmente em `storage/uploads` (servidos apenas a utilizadores autenticados)

Tudo o que é usado aqui tem camada gratuita (Google Cloud OAuth, Azure AD App
registration e SQLite são grátis; para produção, Neon/Supabase Postgres têm
plano gratuito).

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

## Como correr localmente

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Criar o ficheiro `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

3. Gerar um `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. Configurar pelo menos um fornecedor de login (grátis):

   **Google** — https://console.cloud.google.com/apis/credentials
   - Criar credenciais OAuth 2.0 (tipo "Aplicação Web")
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copiar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` para o `.env`

   **Microsoft** — https://portal.azure.com → App registrations → New registration
   - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
   - "Accounts in any organizational directory and personal Microsoft accounts"
   - Copiar `AZURE_AD_CLIENT_ID`, criar um client secret em "Certificates & secrets"
     e copiar `AZURE_AD_CLIENT_SECRET`. `AZURE_AD_TENANT_ID` pode ficar `common`.

5. Criar a base de dados e aplicar o schema:

   ```bash
   npx prisma migrate dev --name init
   ```

6. Arrancar o servidor:

   ```bash
   npm run dev
   ```

7. Abrir http://localhost:3000 e entrar com Google/Microsoft. O primeiro
   utilizador torna-se ADMIN automaticamente — depois pode promover outros
   a `APPROVER` em `/admin/users` para poderem ser escolhidos como
   aprovadores.

## Próximos passos sugeridos

- Notificações por email quando um documento é submetido/aprovado/rejeitado.
- Importação automática de emails (ex: caixa de correio dedicada + regra de
  reencaminhamento, ou API do Gmail/Microsoft Graph) para criar documentos
  automaticamente a partir de anexos.
- Múltiplos aprovadores em sequência (workflow com mais do que um passo).
- Mudar `prisma/schema.prisma` para `provider = "postgresql"` e usar uma
  base de dados gratuita (Neon, Supabase) quando for para produção.
- Mudar o armazenamento de ficheiros para um serviço externo (ex: Supabase
  Storage, grátis) se fizeres deploy num ambiente sem disco persistente
  (como a Vercel).
