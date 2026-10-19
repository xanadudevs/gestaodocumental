import { UNIT_LABELS } from "@/lib/status";

// Tabela de colaboradores e responsabilidades da DANAD, tal como vem do
// Excel (colunas separadas por tab). Serve de ponto de partida na importação.
export const DANAD_TABLE = `Unidade	Colaborador	Função/Responsabilidade
Direção	Bruno Trigo	Diretor
Assessoria DANAD	Teresa Alves	Assessoria DANAD
UID	Rafael Franco	Central de Negócios
UID	Camila Cruz	Portal Scubo
UID	Carlos Ferreira	Plataforma Live, Teleconsultas; Central Telecuidados
UID	Pedro Pinho	Detecção Precoce, Serviço Apoio Técnico Detect SNS24
UID	Sérgio Veiga	Portal Inovar Saúde, Gestão Serviços
UIA	Ana Lopes	Portal Tempos, Planos de Emergência
UIA	Andreia Serrano	Analítica, Speed-to-Text
UIA	Isa Nunes	SDM
UIA	João Melão	SIMSNS, SIARS, MIMUF
UIA	Licínio Gonçalves	BI CSP, PAUDES, Equidade
UIA	Maria Esquível	BI Hospitalar, BI SINAVE
UIA	Mariana Reigado	Gestão de Serviço, Pedidos de Dados
UIA	Mei Li (Daniel Domingues)	BI SIGA / SINACC
UIA	Pedro Cepa	SIGEF
UIA	Susana Tomé	SICA
UIA	Sara Hassam	BIRH, Transparência
UIA	Sara Franco	BIMH, BDMH, BIER
UIA	Vanessa Lima	Data Lake
URN	Ana Carvalho	RNU, RNU 2.0
URN	Marco Dias	RNP, RNP 2.0, PRVR, INPS
URN	Susana Vilares	SICO, RENNDA, RENTEV, RENTEV 2.0, SICO 2.0, RENNDA NEXTGen
URN	Giselly Vieira	SGES, SGES 2.0, EcoSaúde, Acompanhamento Contratos PRR
UPACE	André Brito	PNB
UPACE	Estefânia Araújo	Conformidade, Controlo PRR
UPACE	Joana Cunha	Arquitetura Técnica, Monitorização e Avaliação de Plataformas IOP
UPACE	João Quina	LIGHT
UPACE	Josiane Araújo	UX / UI
UPACE	Patrícia Rodrigues	Servidor Terminologias, Plataforma IOP, Health Data Dispatcher
UPACE	Sara Russo	Interoperabilidade Semântica
UPACE	Susana Dias	Portal ELO`;

export type ImportItem = {
  name: string;
  unitCode: string;
  ownerName: string;
  // Responsabilidade que não parece um sistema (assessoria, conformidade,
  // UX/UI, ...): na pré-visualização começa desmarcada.
  likelyNotSystem: boolean;
};

export type ParseResult = { items: ImportItem[]; warnings: string[] };

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Responsabilidades da tabela que não são sistemas.
const NOT_SYSTEMS = new Set(
  [
    "Diretor",
    "Assessoria DANAD",
    "Gestão Serviços",
    "Gestão de Serviço",
    "Planos de Emergência",
    "Pedidos de Dados",
    "Conformidade",
    "Controlo PRR",
    "Arquitetura Técnica",
    "Monitorização e Avaliação de Plataformas IOP",
    "UX / UI",
    "Interoperabilidade Semântica",
    "Acompanhamento Contratos PRR",
  ].map(norm)
);

const UNIT_ALIASES: Record<string, string> = {
  direcao: "DANAD",
  danad: "DANAD",
  "assessoria danad": "DANAD",
  uid: "UID",
  uia: "UIA",
  urn: "URN",
  upace: "UPACE",
  pace: "UPACE",
};

function unitCode(raw: string) {
  const code = UNIT_ALIASES[norm(raw)];
  return code && code in UNIT_LABELS ? code : null;
}

// Lê a tabela colada do Excel (colunas separadas por tab): Unidade,
// Colaborador, Função/Responsabilidade. Aceita uma coluna "Direção" à
// frente (usa sempre as três últimas). Cada responsabilidade separada por
// vírgula ou ponto e vírgula passa a ser um sistema, com o colaborador
// como responsável.
export function parseSystemsTable(text: string): ParseResult {
  const items: ImportItem[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.length < 3) {
      warnings.push(`Linha ${i + 1} ignorada: faltam colunas (separa-as com tab, como no Excel).`);
      return;
    }
    const [unit, owner, duties] = cells.slice(-3);
    if (norm(owner) === "colaborador") return; // cabeçalho
    const code = unitCode(unit);
    if (!code) {
      warnings.push(`Linha ${i + 1} ignorada: unidade "${unit}" desconhecida.`);
      return;
    }
    for (const name of duties.split(/[,;]/).map((n) => n.trim()).filter(Boolean)) {
      const key = norm(name);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ name, unitCode: code, ownerName: owner, likelyNotSystem: NOT_SYSTEMS.has(key) });
    }
  });

  return { items, warnings };
}
