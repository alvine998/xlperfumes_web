import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { StoreStockManagement } from "./store-stock-management";
import "../../../styles/dashboard.css";
import "../../../styles/store-stock.css";

export const metadata: Metadata = {
  title: "Stok Toko | XL Perfumes",
  description: "Pantau jumlah stok dan pembaruan stok di setiap toko.",
};

export default function StoreStockPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> STOK TOKO</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedStoreStock />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStoreStock() {
  await requireFeatureAccess("store_inventory");
  return <StoreStockManagement />;
}
