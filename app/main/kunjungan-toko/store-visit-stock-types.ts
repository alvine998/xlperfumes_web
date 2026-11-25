export type VisitStock = {
  id: string;
  variantId: number;
  variantName: string;
  variantQuantity: number;
  variantUnit: string;
  totalStock: number;
};

export function isVisitStock(value: unknown): value is VisitStock {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "variantId" in value && typeof value.variantId === "number" &&
    "variantName" in value && typeof value.variantName === "string" &&
    "variantQuantity" in value && typeof value.variantQuantity === "number" &&
    "variantUnit" in value && typeof value.variantUnit === "string" &&
    "totalStock" in value && typeof value.totalStock === "number";
}
