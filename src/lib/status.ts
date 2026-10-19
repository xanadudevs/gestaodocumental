import type { PrismaClient } from "@prisma/client";

// Estado de um componente (e, por agregação, de um sistema).
export const ServiceStatus = {
  OK: "OK",
  DEGRADED: "DEGRADED",
  DOWN: "DOWN",
  UNKNOWN: "UNKNOWN",
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const SERVICE_STATUSES: ServiceStatus[] = ["OK", "DEGRADED", "DOWN", "UNKNOWN"];

export const STATUS_LABELS: Record<string, string> = {
  OK: "OK",
  DEGRADED: "Degradado",
  DOWN: "Em baixo",
  UNKNOWN: "Por verificar",
};

// Cores do semáforo (classes Tailwind completas, para não serem purgadas).
export const STATUS_STYLES: Record<string, { badge: string; dot: string; bar: string }> = {
  OK: { badge: "bg-green-100 text-green-800", dot: "bg-green-500", bar: "bg-green-500" },
  DEGRADED: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", bar: "bg-amber-500" },
  DOWN: { badge: "bg-red-100 text-red-800", dot: "bg-red-600", bar: "bg-red-600" },
  UNKNOWN: { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400", bar: "bg-gray-300" },
};

// Do pior para o melhor: o estado de um sistema é o de maior severidade.
const SEVERITY: Record<string, number> = { DOWN: 3, DEGRADED: 2, UNKNOWN: 1, OK: 0 };

export function worstStatus(statuses: string[]): ServiceStatus {
  if (statuses.length === 0) return ServiceStatus.UNKNOWN;
  return statuses.reduce((worst, s) => ((SEVERITY[s] ?? 1) > (SEVERITY[worst] ?? 1) ? s : worst)) as ServiceStatus;
}

export const ComponentKind = {
  APPLICATION: "APPLICATION",
  DATABASE: "DATABASE",
  SERVICE: "SERVICE",
  INTEGRATION: "INTEGRATION",
  INFRA: "INFRA",
  OTHER: "OTHER",
} as const;

export const COMPONENT_KIND_LABELS: Record<string, string> = {
  APPLICATION: "Aplicação",
  DATABASE: "Base de dados",
  SERVICE: "Serviço / API",
  INTEGRATION: "Integração",
  INFRA: "Infraestrutura",
  OTHER: "Outro",
};

export const CRITICALITY_LABELS: Record<string, string> = {
  HIGH: "Crítico",
  MEDIUM: "Importante",
  LOW: "Normal",
};

// Um estado confirmado há mais do que isto já não é de confiança numa crise.
export const STALE_AFTER_MINUTES = 120;

export function isStale(statusAt: Date, now = new Date()) {
  return now.getTime() - statusAt.getTime() > STALE_AFTER_MINUTES * 60_000;
}

export const UNIT_LABELS: Record<string, string> = {
  DANAD: "Direção",
  UID: "UID — Inovação Digital",
  UIA: "UIA — Analytics, IA e Robótica",
  URN: "URN — Registos Nacionais",
  UPACE: "UPACE — Planeamento, Arquitetura, Conformidade e Engenharia",
};

export const UNIT_ORDER = ["DANAD", "UID", "UIA", "URN", "UPACE"];

// Catálogo inicial, a partir da tabela de colaboradores/responsabilidades.
// Ficam de fora as responsabilidades que não são sistemas (assessoria,
// conformidade, UX/UI, gestão de serviço, ...). O Administrador pode
// acrescentar ou remover sistemas na própria página.
export const SYSTEM_CATALOG: { unit: string; owner: string; systems: string[] }[] = [
  { unit: "UID", owner: "Rafael Franco", systems: ["Central de Negócios"] },
  { unit: "UID", owner: "Camila Cruz", systems: ["Portal Scubo"] },
  { unit: "UID", owner: "Carlos Ferreira", systems: ["Plataforma Live", "Teleconsultas", "Central Telecuidados"] },
  { unit: "UID", owner: "Pedro Pinho", systems: ["Detecção Precoce", "Serviço Apoio Técnico Detect SNS24"] },
  { unit: "UID", owner: "Sérgio Veiga", systems: ["Portal Inovar Saúde"] },
  { unit: "UIA", owner: "Ana Lopes", systems: ["Portal Tempos"] },
  { unit: "UIA", owner: "Andreia Serrano", systems: ["Analítica", "Speed-to-Text"] },
  { unit: "UIA", owner: "Isa Nunes", systems: ["SDM"] },
  { unit: "UIA", owner: "João Melão", systems: ["SIMSNS", "SIARS", "MIMUF"] },
  { unit: "UIA", owner: "Licínio Gonçalves", systems: ["BI CSP", "PAUDES", "Equidade"] },
  { unit: "UIA", owner: "Maria Esquível", systems: ["BI Hospitalar", "BI SINAVE"] },
  { unit: "UIA", owner: "Mei Li (Daniel Domingues)", systems: ["BI SIGA / SINACC"] },
  { unit: "UIA", owner: "Pedro Cepa", systems: ["SIGEF"] },
  { unit: "UIA", owner: "Susana Tomé", systems: ["SICA"] },
  { unit: "UIA", owner: "Sara Hassam", systems: ["BIRH", "Transparência"] },
  { unit: "UIA", owner: "Sara Franco", systems: ["BIMH", "BDMH", "BIER"] },
  { unit: "UIA", owner: "Vanessa Lima", systems: ["Data Lake"] },
  { unit: "URN", owner: "Ana Carvalho", systems: ["RNU", "RNU 2.0"] },
  { unit: "URN", owner: "Marco Dias", systems: ["RNP", "RNP 2.0", "PRVR", "INPS"] },
  {
    unit: "URN",
    owner: "Susana Vilares",
    systems: ["SICO", "RENNDA", "RENTEV", "RENTEV 2.0", "SICO 2.0", "RENNDA NEXTGen"],
  },
  { unit: "URN", owner: "Giselly Vieira", systems: ["SGES", "SGES 2.0", "EcoSaúde"] },
  { unit: "UPACE", owner: "André Brito", systems: ["PNB"] },
  { unit: "UPACE", owner: "João Quina", systems: ["LIGHT"] },
  {
    unit: "UPACE",
    owner: "Patrícia Rodrigues",
    systems: ["Servidor Terminologias", "Plataforma IOP", "Health Data Dispatcher"],
  },
  { unit: "UPACE", owner: "Susana Dias", systems: ["Portal ELO"] },
];

// Componentes criados por omissão em cada sistema novo; o Administrador
// acrescenta outros (ex: "API de integração", "Servidor") onde fizer falta.
export const DEFAULT_COMPONENTS = [
  { name: "Aplicação", kind: ComponentKind.APPLICATION },
  { name: "Base de dados", kind: ComponentKind.DATABASE },
];

export type SeedResult = { created: string[]; existing: number };

export async function seedSystemCatalog(prisma: PrismaClient): Promise<SeedResult> {
  const existing = new Set((await prisma.statusSystem.findMany({ select: { name: true } })).map((s) => s.name));
  const created: string[] = [];
  for (const group of SYSTEM_CATALOG) {
    for (const name of group.systems) {
      if (existing.has(name)) continue;
      await prisma.statusSystem.create({
        data: {
          name,
          unitCode: group.unit,
          ownerName: group.owner,
          components: {
            create: DEFAULT_COMPONENTS.map((c, i) => ({ ...c, order: i })),
          },
        },
      });
      existing.add(name);
      created.push(name);
    }
  }
  return { created, existing: existing.size - created.length };
}

// --- Leitura e agregação (usadas na página, no relatório e na API) ---

export type SystemView = {
  id: string;
  name: string;
  unitCode: string;
  ownerName: string | null;
  criticality: string;
  notes: string | null;
  status: ServiceStatus;
  // Confirmação mais antiga entre os componentes (a que limita a confiança).
  oldestStatusAt: Date | null;
  stale: boolean;
  components: {
    id: string;
    name: string;
    kind: string;
    status: string;
    note: string | null;
    statusAt: Date;
    statusByName: string | null;
    stale: boolean;
  }[];
};

export async function loadSystems(prisma: PrismaClient, now = new Date()): Promise<SystemView[]> {
  const systems = await prisma.statusSystem.findMany({
    include: { components: { orderBy: [{ order: "asc" }, { name: "asc" }] } },
    orderBy: { name: "asc" },
  });
  return systems.map((s) => {
    const components = s.components.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      status: c.status,
      note: c.note,
      statusAt: c.statusAt,
      statusByName: c.statusByName,
      // "Por verificar" não é "desatualizado": ainda não há nada a confirmar.
      stale: c.status !== ServiceStatus.UNKNOWN && isStale(c.statusAt, now),
    }));
    const times = components.map((c) => c.statusAt.getTime());
    return {
      id: s.id,
      name: s.name,
      unitCode: s.unitCode,
      ownerName: s.ownerName,
      criticality: s.criticality,
      notes: s.notes,
      status: worstStatus(components.map((c) => c.status)),
      oldestStatusAt: times.length ? new Date(Math.min(...times)) : null,
      stale: components.some((c) => c.stale),
      components,
    };
  });
}

export type Counts = Record<ServiceStatus, number> & { total: number };

function emptyCounts(): Counts {
  return { OK: 0, DEGRADED: 0, DOWN: 0, UNKNOWN: 0, total: 0 };
}

export type StatusSummary = {
  generatedAt: Date;
  systems: Counts;
  components: Counts;
  // % de sistemas OK e % já verificados (estado diferente de "Por verificar")
  pctOk: number;
  pctVerified: number;
  stale: number;
  criticalNotOk: SystemView[];
  byUnit: { unit: string; label: string; counts: Counts; pctOk: number }[];
};

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

export function summarize(systems: SystemView[], now = new Date()): StatusSummary {
  const sys = emptyCounts();
  const comp = emptyCounts();
  const units = new Map<string, Counts>();
  for (const s of systems) {
    sys[s.status]++;
    sys.total++;
    const u = units.get(s.unitCode) ?? emptyCounts();
    u[s.status]++;
    u.total++;
    units.set(s.unitCode, u);
    for (const c of s.components) {
      comp[c.status as ServiceStatus]++;
      comp.total++;
    }
  }
  const unitCodes = [...units.keys()].sort(
    (a, b) => (UNIT_ORDER.indexOf(a) + 1 || 99) - (UNIT_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b)
  );
  return {
    generatedAt: now,
    systems: sys,
    components: comp,
    pctOk: pct(sys.OK, sys.total),
    pctVerified: pct(sys.total - sys.UNKNOWN, sys.total),
    stale: systems.filter((s) => s.stale).length,
    criticalNotOk: systems.filter(
      (s) => s.criticality === "HIGH" && (s.status === ServiceStatus.DOWN || s.status === ServiceStatus.DEGRADED)
    ),
    byUnit: unitCodes.map((unit) => ({
      unit,
      label: UNIT_LABELS[unit] ?? unit,
      counts: units.get(unit)!,
      pctOk: pct(units.get(unit)!.OK, units.get(unit)!.total),
    })),
  };
}

export const MANAGE_STATUS_MESSAGE = "Só um Administrador pode gerir o catálogo de sistemas";
