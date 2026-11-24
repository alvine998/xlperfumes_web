export const FEATURE_KEYS = [
  "overview",
  "store_inventory",
  "warehouse_inventory",
  "variants",
  "products",
  "generate_product",
  "print_product_barcodes",
  "branchs",
  "zonas",
  "stores",
  "store_visit",
  "print_store_barcodes",
  "users",
  "roles",
  "activity_logs",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeaturePermissions = Record<FeatureKey, boolean>;

export function isFeaturePermissions(value: unknown): value is FeaturePermissions {
  if (!isRecord(value)) return false;
  return FEATURE_KEYS.every((feature) =>
    typeof value[feature] === "boolean",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
