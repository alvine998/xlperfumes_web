import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../../main-content-loading";
import { NotificationDropdown } from "../../dashboard/notification-dropdown";
import { TodayLabel } from "../../dashboard/today-label";
import { ProfileMenu } from "../../profile-menu";
import { StoreVisitDetail } from "../store-visit-detail";
import "../../../../styles/dashboard.css";
import "../../../../styles/store-visits.css";

export const metadata: Metadata = {
  title: "Detail Kunjungan Toko | XL Perfumes",
  description: "Informasi toko yang dipilih untuk kunjungan lapangan.",
};

type StoreVisitDetailPageProps = {
  searchParams: Promise<{ storeId?: string | string[]; storeName?: string | string[] }>;
};

export default function StoreVisitDetailPage({ searchParams }: StoreVisitDetailPageProps) {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> KUNJUNGAN TOKO <span>/</span> DETAIL</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedStoreVisitDetail searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStoreVisitDetail({ searchParams }: StoreVisitDetailPageProps) {
  const params = await searchParams;
  const storeId = Array.isArray(params.storeId) ? params.storeId[0] ?? "" : params.storeId ?? "";
  const storeName = Array.isArray(params.storeName) ? params.storeName[0] ?? "" : params.storeName ?? "";
  await requireFeatureAccess("store_visit");
  return <StoreVisitDetail key={`${storeId}:${storeName}`} storeId={storeId} storeName={storeName} />;
}
