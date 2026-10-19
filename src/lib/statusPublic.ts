import { timingSafeEqual } from "crypto";

// Token da página pública do estado dos sistemas. Pode ser mudado com
// STATUS_PUBLIC_TOKEN (na Vercel) sem alterar código.
export const STATUS_PUBLIC_TOKEN = process.env.STATUS_PUBLIC_TOKEN || "SPMS#123";

export function isValidStatusToken(candidate: string | undefined) {
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(STATUS_PUBLIC_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

// O "#" tem de ir codificado (%23), senão o browser trata-o como âncora.
export function publicStatusPath() {
  return `/estado-publico?token=${encodeURIComponent(STATUS_PUBLIC_TOKEN)}`;
}

// Escritas feitas a partir da página com token (sem login): o token vem no
// cabeçalho x-status-token e o nome de quem atualiza vem no corpo.
export const STATUS_TOKEN_HEADER = "x-status-token";
