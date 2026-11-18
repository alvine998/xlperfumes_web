import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axios from "axios";
import { api } from "@/lib/api";
import "../../styles/modal.css";

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div role="status">Memverifikasi sesi…</div>}>
      <AuthenticatedMain>{children}</AuthenticatedMain>
    </Suspense>
  );
}

async function AuthenticatedMain({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get("xlperfumes_token")?.value;
  if (!token) redirect("/");

  try {
    await api.get("/auth/me", { headers: { Cookie: `xlperfumes_token=${token}` } });
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) redirect("/");
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status) throw new Error(`Unable to verify the current user (HTTP ${status}).`);
    throw error;
  }

  return children;
}
