import { Role } from "@/lib/enums";

export function canApprove(role: Role) {
  return role === Role.ADMIN || role === Role.APPROVER;
}

export function canManageUsers(role: Role) {
  return role === Role.ADMIN;
}

export function canDecideOn(role: Role, approverId: string | null, userId: string) {
  if (role === Role.ADMIN) return true;
  if (role === Role.APPROVER && approverId === userId) return true;
  return false;
}

// Apoio Administrativo (e ADMIN) dá o acesso depois da aprovação do
// coordenador, e liberta licenças que deixam de ser precisas.
export function canManageLicenses(role: Role) {
  return role === Role.ADMIN || role === Role.SUPPORT;
}

// Editar um pedido de licença: o Admin e o Gestor de Licenças em qualquer
// estado; o coordenador indicado, enquanto o pedido está por decidir.
export function canEditLicense(role: Role, status: string, coordinatorId: string, userId: string) {
  if (canManageLicenses(role)) return true;
  return status === "PENDING" && coordinatorId === userId;
}

export function canDecideOnLicense(role: Role, coordinatorId: string, userId: string) {
  return role === Role.ADMIN || coordinatorId === userId;
}
