import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { WarehouseStockManagement } from "./warehouse-stock-management";
import "../../../styles/dashboard.css";
import "../../../styles/warehouse-stock.css";

export const metadata: Metadata = {
  title: "Stok Gudang | XL Perfumes",
  description: "Pantau persediaan barang di gudang berdasarkan cabang.",
};

export default function WarehouseStockPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> STOK GUDANG</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedWarehouseStock />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedWarehouseStock() {
  await requireFeatureAccess("warehouse_inventory");
  return <WarehouseStockManagement />;
}
