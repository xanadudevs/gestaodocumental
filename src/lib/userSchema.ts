import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";

// Campos opcionais dos formulários chegam como "" quando vazios.
export const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

export const nameSchema = z.string().trim().min(1, "Nome em falta");
export const emailSchema = z.string().trim().toLowerCase().email("Email inválido");
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "O utilizador tem de ter pelo menos 3 caracteres")
  .regex(/^[a-zA-Z0-9._-]+$/, "O utilizador só pode ter letras, números, pontos, hífens e _");
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
