import { z } from "zod";

const str = (max = 5000) => z.string().trim().max(max).optional().default("");

export const informacaoSchema = z.object({
  assunto: z.string({ required_error: "Assunto em falta" }).trim().min(1, "Assunto em falta").max(300),
  destinatario: z.string({ required_error: "Destinatário em falta" }).trim().min(1, "Destinatário em falta").max(200),
  enquadramento: str(20000),
  analise: str(20000),
  conclusao: str(20000),
  anexos: str(2000),
  signatarios: z
    .array(z.object({ unidade: str(200), nome: str(200) }))
    .max(10)
    .optional()
    .default([]),
});
export type InformacaoData = z.infer<typeof informacaoSchema>;

export const oficioSchema = z.object({
  assunto: z.string({ required_error: "Assunto em falta" }).trim().min(1, "Assunto em falta").max(300),
  tratamento: str(100),
  destNome: z
    .string({ required_error: "Nome do destinatário em falta" })
    .trim()
    .min(1, "Nome do destinatário em falta")
    .max(200),
  destCargo: str(200),
  destInstituicao: str(200),
  destMorada: str(300),
  destCodigoPostal: str(100),
  vossaRef: str(100),
  saudacao: str(200),
  corpo: z.string({ required_error: "Texto do ofício em falta" }).trim().min(1, "Texto do ofício em falta").max(20000),
  fecho: str(200),
  signatarioCargo: str(200),
  signatarioNome: str(200),
  autorSigla: str(20),
});
export type OficioData = z.infer<typeof oficioSchema>;

// Destino mostrado na lista (para onde vai o documento).
export function destinationOf(type: string, data: InformacaoData | OficioData) {
  if ("destinatario" in data) return data.destinatario;
  return [data.destNome, data.destInstituicao].filter(Boolean).join(" — ");
}
