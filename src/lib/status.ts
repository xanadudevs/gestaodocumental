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
  ULS: "ULS",
  SERVICE_UNIT: "SERVICE_UNIT",
  OTHER: "OTHER",
} as const;

export const COMPONENT_KIND_LABELS: Record<string, string> = {
  APPLICATION: "Aplicação",
  DATABASE: "Base de dados",
  SERVICE: "Serviço / API",
  INTEGRATION: "Integração",
  INFRA: "Infraestrutura",
  ULS: "ULS",
  SERVICE_UNIT: "Serviço",
  OTHER: "Outro",
};

export const CRITICALITY_LABELS: Record<string, string> = {
  HIGH: "Elevado",
  MEDIUM: "Normal",
  LOW: "Baixo",
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

// Componentes criados por omissão em cada sistema novo; o Administrador
// acrescenta outros (ex: "API de integração", "Servidor") onde fizer falta.
export const DEFAULT_COMPONENTS = [
  { name: "Aplicação", kind: ComponentKind.APPLICATION },
  { name: "Base de dados", kind: ComponentKind.DATABASE },
  { name: "Serviços / API", kind: ComponentKind.SERVICE },
];

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

// --- Prioridade por impacto ---

const CRITICALITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const STATUS_WEIGHT: Record<string, number> = { DOWN: 3, DEGRADED: 2, UNKNOWN: 1, OK: 0 };

// Impacto = criticidade (Elevado 3, Normal 2, Baixo 1) × gravidade do estado.
// Um sistema de criticidade elevada em baixo (9) vem antes de um normal em
// baixo (6), de um elevado degradado (6) e de um elevado ainda por verificar (3).
export function impactScore(s: Pick<SystemView, "criticality" | "status">) {
  return (CRITICALITY_WEIGHT[s.criticality] ?? 2) * (STATUS_WEIGHT[s.status] ?? 0);
}

// Sistemas que não estão OK, do maior para o menor impacto; em empate, o
// estado mais grave, a criticidade mais alta, mais componentes afetados e o nome.
export function systemsByImpact(systems: SystemView[]): SystemView[] {
  const affected = (s: SystemView) => s.components.filter((c) => c.status !== "OK").length;
  return systems
    .filter((s) => s.status !== ServiceStatus.OK)
    .sort(
      (a, b) =>
        impactScore(b) - impactScore(a) ||
        (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0) ||
        (CRITICALITY_WEIGHT[b.criticality] ?? 2) - (CRITICALITY_WEIGHT[a.criticality] ?? 2) ||
        affected(b) - affected(a) ||
        a.name.localeCompare(b.name)
    );
}
