export type Branch = {
  id: number;
  name: string;
  city: string;
  address: string;
  createdBy: string | null;
  createdAt: string;
  storeCount: number;
};

export function isBranch(value: unknown): value is Branch {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number" &&
    "name" in value && typeof value.name === "string" &&
    "city" in value && typeof value.city === "string" &&
    "address" in value && typeof value.address === "string" &&
    "createdBy" in value &&
    (typeof value.createdBy === "string" || value.createdBy === null) &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "storeCount" in value && typeof value.storeCount === "number";
}
