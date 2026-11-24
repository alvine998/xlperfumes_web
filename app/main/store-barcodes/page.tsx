import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { StoreBarcodes } from "./store-barcodes";
import "../../../styles/dashboard.css";
import "../../../styles/store-barcodes.css";

export const metadata: Metadata = {
  title: "Cetak Barcode Toko | XL Perfumes",
  description: "Lihat dan cetak QR Code toko XL Perfumes.",
};

export default function StoreBarcodesPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> CETAK BARCODE TOKO</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedStoreBarcodes />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStoreBarcodes() {
  await requireFeatureAccess("print_store_barcodes");
  return <StoreBarcodes />;
}
