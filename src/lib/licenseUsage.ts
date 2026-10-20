// Funções puras sobre o limite de licenças por Direção (seguras para o browser).

// A Direção já ocupou todas as licenças do produto? (sem limite: nunca)
export function isAtLimit(product: { maxPerDirection: number | null }, used: number) {
  return product.maxPerDirection !== null && used >= product.maxPerDirection;
}

// "3 de 22 licenças Figma ocupadas" ou, sem limite, "3 licenças Copilot ocupadas".
export function usageText(product: { name: string; maxPerDirection: number | null }, used: number) {
  return product.maxPerDirection === null
    ? `${used} licenças ${product.name} ocupadas`
    : `${used} de ${product.maxPerDirection} licenças ${product.name} ocupadas`;
}
