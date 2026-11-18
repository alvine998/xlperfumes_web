export const FEATURE_KEYS = [
  "overview",
  "inventory",
  "sales",
  "stores",
  "users",
  "activity",
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
