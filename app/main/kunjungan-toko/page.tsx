import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { StoreVisitEntry } from "./store-visit-entry";
import "../../../styles/dashboard.css";
import "../../../styles/store-visits.css";

export const metadata: Metadata = {
  title: "Kunjungan Toko | XL Perfumes",
  description: "Pilih toko untuk memulai kunjungan melalui QR Code atau nama toko.",
};

type StoreVisitPageProps = {
  searchParams: Promise<{ storeId?: string | string[]; storeName?: string | string[] }>;
};

export default function StoreVisitPage({ searchParams }: StoreVisitPageProps) {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> KUNJUNGAN TOKO</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedStoreVisit searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStoreVisit({ searchParams }: StoreVisitPageProps) {
  const params = await searchParams;
  const storeId = Array.isArray(params.storeId) ? params.storeId[0] ?? "" : params.storeId ?? "";
  const storeName = Array.isArray(params.storeName) ? params.storeName[0] ?? "" : params.storeName ?? "";
  await requireFeatureAccess("store_visit");
  const targetStoreId = /^\d+$/.test(storeId) ? Number(storeId) : null;
  return <StoreVisitEntry targetStoreId={targetStoreId} targetStoreName={storeName} />;
}
