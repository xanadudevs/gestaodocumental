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

export function canDecideOnLicense(role: Role, coordinatorId: string, userId: string) {
  return role === Role.ADMIN || coordinatorId === userId;
}
