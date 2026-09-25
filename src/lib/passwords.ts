import bcrypt from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `A password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
