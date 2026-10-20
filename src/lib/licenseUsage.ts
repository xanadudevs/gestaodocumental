// Funções puras sobre os limites de licenças (seguras para o browser).

type LimitConfig = {
  maxPerDirection: number | null;
  // Quota por unidade (código da unidade -> licenças). Quando existe, o
  // limite conta-se por coordenação e não pela Direção toda.
  maxPerUnit?: Record<string, number>;
};

// Limite aplicável a um pedido da unidade `unitCode`: a quota da unidade (0
// se não tem nenhuma) ou o máximo da Direção; null = sem limite.
export function limitFor(product: LimitConfig, unitCode: string | undefined): number | null {
  if (product.maxPerUnit) return product.maxPerUnit[unitCode ?? ""] ?? 0;
  return product.maxPerDirection;
}

// Já ocupou todas as licenças do limite? (sem limite: nunca)
export function isAtLimit(limit: number | null, used: number) {
  return limit !== null && used >= limit;
}

// "3 de 22 licenças Figma ocupadas" ou, sem limite, "3 licenças Copilot ocupadas".
export function usageText(productName: string, limit: number | null, used: number) {
  return limit === null
    ? `${used} licenças ${productName} ocupadas`
    : `${used} de ${limit} licenças ${productName} ocupadas`;
}
