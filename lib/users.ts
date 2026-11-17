export const USER_ROLES = ["admin", "spg", "collecting", "gudang", "owner"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type User = {
  id: number;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

export function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value &&
    typeof value.id === "number" &&
    "username" in value &&
    typeof value.username === "string" &&
    "role" in value &&
    isUserRole(value.role) &&
    "isActive" in value &&
    typeof value.isActive === "boolean" &&
    "createdAt" in value &&
    typeof value.createdAt === "string";
}
