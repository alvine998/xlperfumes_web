export type Store = {
  id: number;
  name: string;
  branch: string;
  branchId?: number | null;
  zonaId?: number | null;
  zona?: string | null;
  routeIndex: number | null;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

export function isStore(value: unknown): value is Store {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number" &&
    "name" in value && typeof value.name === "string" &&
    "branch" in value && typeof value.branch === "string" &&
    (!("branchId" in value) ||
      value.branchId === null ||
      typeof value.branchId === "number") &&
    (!("zonaId" in value) ||
      value.zonaId === null ||
      typeof value.zonaId === "number") &&
    (!("zona" in value) ||
      value.zona === null ||
      typeof value.zona === "string") &&
    "routeIndex" in value &&
    (value.routeIndex === null || typeof value.routeIndex === "number") &&
    "address" in value && typeof value.address === "string" &&
    "latitude" in value && typeof value.latitude === "number" &&
    "longitude" in value && typeof value.longitude === "number" &&
    "createdAt" in value && typeof value.createdAt === "string";
}
