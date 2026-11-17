import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

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

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { cookie: `xlperfumes_token=${token}` },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/");
  if (!response.ok) {
    throw new Error(`Unable to verify the current user (HTTP ${response.status}).`);
  }

  return children;
}
