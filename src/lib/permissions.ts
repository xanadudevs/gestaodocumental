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
