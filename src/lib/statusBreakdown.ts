import { ComponentKind } from "@/lib/status";

// Sistemas que não se verificam como "aplicação + base de dados", mas por
// ULS (LIGHT) ou por serviço (PNB): cada elemento é um componente, e o
// estado do sistema é o pior deles. Aplicado ao importar o catálogo.
export type Breakdown = { kind: string; names: string[] };

const LIGHT_ULS = [
  "Hospital da Horta",
  "Unidade Local de Saúde da Póvoa de Varzim/Vila do Conde, EPE",
  "Unidade Local de Saúde de Barcelos/Esposende, EPE",
  "Unidade Local de Saúde de Entre Douro e Vouga, EPE",
  "Unidade Local de Saúde de Gaia/Espinho, EPE",
  "Unidade Local de Saúde de Matosinhos, EPE",
  "Unidade Local de Saúde de Santo António, EPE",
  "Unidade Local de Saúde de São João, EPE",
  "Unidade Local de Saúde de Trás-os-Montes e Alto Douro, EPE",
  "Unidade Local de Saúde do Alto Ave, EPE",
  "Unidade Local de Saúde do Alto Minho, EPE",
  "Unidade Local de Saúde do Médio Ave, EPE",
  "Unidade Local de Saúde do Nordeste, EPE",
  "Unidade Local de Saúde do Tâmega e Sousa, EPE",
  "Santa Casa Misericórdia de Fafe",
  "Santa Casa Misericórdia de Riba D'Ave",
  "Santa Casa Misericórdia de Vila Verde",
  "Unidade Local de Saúde de Braga",
  "Instituto Português de Oncologia de Coimbra Francisco Gentil, EPE",
  "Unidade Local de Saúde da Cova da Beira, EPE",
  "Unidade Local de Saúde da Guarda, EPE",
  "Unidade Local de Saúde da Região de Aveiro, EPE",
  "Unidade Local de Saúde da Região de Leiria, EPE",
  "Unidade Local de Saúde de Castelo Branco, EPE",
  "Unidade Local de Saúde de Coimbra, EPE",
  "Unidade Local de Saúde de Viseu Dão-Lafões, EPE",
  "Unidade Local de Saúde do Baixo Mondego, EPE",
  "Santa Casa Misericórdia de Anadia",
  "Associação Protetora dos Diabéticos de Portugal",
  "Instituto Português de Oncologia de Lisboa Francisco Gentil, EPE",
  "Unidade Local de Saúde da Arrábida, EPE",
  "Unidade Local de Saúde da Lezíria, EPE",
  "Unidade Local de Saúde de Almada-Seixal, EPE",
  "Unidade Local de Saúde de Lisboa Ocidental, EPE",
  "Unidade Local de Saúde de São José, EPE",
  "Unidade Local de Saúde do Arco Ribeirinho, EPE",
  "Unidade Local de Saúde do Médio Tejo, EPE",
  "Unidade Local de Saúde do Oeste, EPE",
  "Unidade Local de Saúde do Estuário do Tejo, EPE",
  "Unidade Local de Saúde Loures Odivelas",
  "Unidade Local de Saúde do Alentejo Central, EPE",
  "Unidade Local de Saúde do Alto Alentejo, EPE",
  "Unidade Local de Saúde do Baixo Alentejo, EPE",
  "Unidade Local de Saúde do Litoral Alentejano, EPE",
  "Santa Casa Misericórdia de Serpa",
  "Unidade Local de Saúde do Algarve, EPE",
];

// Abreviatura — designação. Há abreviaturas repetidas (RCU2, MCDT, SIGA), por
// isso o nome do componente leva sempre as duas.
const PNB_SERVICES: [string, string][] = [
  ["PEM", "Sincronismo de Prescrições nas instituições"],
  ["Vacinas", "Boletim de Vacinas e Calendário Vacinal dos utentes à PDS Vacinas pela CES / SClínico CSP / VCI / SINAVE"],
  ["CCC", "Integração dos Certificados de Carta de condução"],
  ["RCU2", "Pesquisas de Medicação Crónica junto ao RCU2"],
  ["RCU2", "Pesquisas de Sincronização Medicação Crónica junto ao RCU2"],
  ["RCU2", "Pesquisas de Alergias junto ao RCU2"],
  ["RNU", "Serviços Pesquisas no âmbito do RNU"],
  ["NCP", "Serviços no âmbito do NCP"],
  ["SiiMA", "Sincronização de resultados de Rastreios"],
  ["SIGA", "Sincronização de Pedidos de Referenciação"],
  ["NAE", "Consulta de nota de alta estruturada"],
  ["SICAD", "Fluxo da referenciação de utentes para o SICAD"],
  ["PEMH", "Fluxos PEMH"],
  ["ADD", "Sincronização dos Certificados de Incapacidade Temporária"],
  ["Resumo Clínico", "Serviço de pesquisa de Resumo Clínico dos Utentes"],
  ["MCDT", "Sincronização de Pedidos - MCDT"],
  ["MCDT", "Resultados MCDT (PDF)"],
  ["SIGA", "Pesquisas e Sincronização de Estado"],
  ["BAS", "Comparticipação adicional em saúde"],
  ["Cros-Domain", "Fluxo Atualização de Contactos do RNU"],
];

export const BREAKDOWNS: Record<string, Breakdown> = {
  light: { kind: ComponentKind.ULS, names: LIGHT_ULS },
  pnb: { kind: ComponentKind.SERVICE_UNIT, names: PNB_SERVICES.map(([abbr, name]) => `${abbr} — ${name}`) },
};

export function breakdownFor(systemName: string): Breakdown | null {
  return BREAKDOWNS[systemName.trim().toLowerCase()] ?? null;
}
