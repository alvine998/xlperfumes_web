export type Zone = {
  id: number;
  name: string;
  branchId: number;
  branch: string;
  createdBy: string | null;
  createdAt: string;
  storeCount: number;
};

export function isZone(value: unknown): value is Zone {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number" &&
    "name" in value && typeof value.name === "string" &&
    "branchId" in value && typeof value.branchId === "number" &&
    "branch" in value && typeof value.branch === "string" &&
    "createdBy" in value &&
    (typeof value.createdBy === "string" || value.createdBy === null) &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "storeCount" in value && typeof value.storeCount === "number";
}
