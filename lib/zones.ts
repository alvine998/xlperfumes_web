import { isUserRole, type User } from "./users";

export type Zone = {
  id: number;
  name: string;
  branchId: number;
  branch: string;
  userPicId: number | null;
  picUsername: string | null;
  createdBy: string | null;
  createdAt: string;
  storeCount: number;
  memberCount: number;
};

export type ZoneCollector = Pick<User, "id" | "username">;
export type ZoneUser = Pick<User, "id" | "username" | "role" | "isActive">;

export function isZoneCollector(value: unknown): value is ZoneCollector {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "number" &&
    "username" in value && typeof value.username === "string";
}

export function isZoneUser(value: unknown): value is ZoneUser {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number" &&
    "username" in value && typeof value.username === "string" &&
    "role" in value && isUserRole(value.role) &&
    "isActive" in value && typeof value.isActive === "boolean";
}

export function isZone(value: unknown): value is Zone {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number" &&
    "name" in value && typeof value.name === "string" &&
    "branchId" in value && typeof value.branchId === "number" &&
    "branch" in value && typeof value.branch === "string" &&
    "userPicId" in value &&
    (typeof value.userPicId === "number" || value.userPicId === null) &&
    "picUsername" in value &&
    (typeof value.picUsername === "string" || value.picUsername === null) &&
    "createdBy" in value &&
    (typeof value.createdBy === "string" || value.createdBy === null) &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "storeCount" in value && typeof value.storeCount === "number" &&
    "memberCount" in value && typeof value.memberCount === "number";
}
