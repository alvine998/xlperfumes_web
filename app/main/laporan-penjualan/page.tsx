import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess, requireRoleAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { SalesReport } from "./sales-report";
import "../../../styles/dashboard.css";
import "../../../styles/laporan-penjualan.css";

export const metadata: Metadata = {
  title: "Laporan Penjualan | XL Perfumes",
  description: "Tinjau produk berstatus terjual dan perbarui statusnya.",
};

export default function SalesReportPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">LAPORAN <span>/</span> LAPORAN PENJUALAN</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedSalesReport />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedSalesReport() {
  await Promise.all([requireFeatureAccess("products"), requireRoleAccess(["admin", "owner"])]);
  return <SalesReport />;
}
