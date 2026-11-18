import "server-only";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import axios from "axios";
import { api } from "@/lib/api";
import { isFeaturePermissions, type FeatureKey, type FeaturePermissions } from "@/lib/permissions";

const loadPermissionsForToken = async (token: string): Promise<FeaturePermissions> => {
  "use cache";
  cacheLife("seconds");

  const { data } = await api.get<unknown>("/auth/me", {
    headers: { Cookie: `xlperfumes_token=${token}` },
  });
  if (!isRecord(data)) throw new Error("The API returned an invalid current user.");
  const user = data.user;
  if (!isRecord(user) || !isFeaturePermissions(user.permissions)) {
    throw new Error("The API returned invalid role permissions.");
  }
  return user.permissions;
};

export async function getCurrentPermissions(): Promise<FeaturePermissions> {
  const token = (await cookies()).get("xlperfumes_token")?.value;
  if (!token) redirect("/");

  try {
    return await loadPermissionsForToken(token);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) redirect("/");
    if (axios.isAxiosError(error) && error.response?.status === 403) notFound();
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      throw new Error(status
        ? `Unable to load role permissions from the API (HTTP ${status}).`
        : `Unable to connect to the API while loading role permissions (${error.code ?? "network error"}).`);
    }
    throw error;
  }
}

export async function requireFeatureAccess(feature: FeatureKey): Promise<FeaturePermissions> {
  return requireAnyFeatureAccess([feature]);
}

export async function requireAnyFeatureAccess(features: FeatureKey[]): Promise<FeaturePermissions> {
  const permissions = await getCurrentPermissions();
  if (!features.some((feature) => permissions[feature])) notFound();
  return permissions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
