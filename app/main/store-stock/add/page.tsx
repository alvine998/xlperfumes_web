import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../../main-content-loading";
import { NotificationDropdown } from "../../dashboard/notification-dropdown";
import { TodayLabel } from "../../dashboard/today-label";
import { ProfileMenu } from "../../profile-menu";
import { AddStoreStock } from "./add-store-stock";
import "../../../../styles/dashboard.css";
import "../../../../styles/store-stock.css";

export const metadata: Metadata = {
  title: "Tambah Stok Toko | XL Perfumes",
  description: "Pindahkan produk dari gudang untuk menambah stok toko.",
};

export default function AddStoreStockPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> TAMBAH STOK</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedAddStoreStock />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedAddStoreStock() {
  await requireFeatureAccess("inventory");
  return <AddStoreStock />;
}
