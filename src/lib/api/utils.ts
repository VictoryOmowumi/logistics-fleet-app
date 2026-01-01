import type { Session } from "next-auth";

export type UserRole = "admin" | "dispatcher" | "manager";

export function isRoleAllowed(session: Session | null, allowed: UserRole[]) {
  const role = session?.user?.role as UserRole | undefined;
  return !!role && allowed.includes(role);
}

export function pickFields(
  source: Record<string, unknown>,
  allowed: string[]
) {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
