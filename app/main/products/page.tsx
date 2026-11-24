import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { ProductsManagement } from "./products-management";
import "../../../styles/dashboard.css";
import "../../../styles/products.css";

export const metadata: Metadata = {
  title: "Daftar Produk | XL Perfumes",
  description: "Lihat dan kelola produk berdasarkan status, cabang, dan tanggal pembaruan.",
};

export default function ProductsPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">INVENTARIS <span>/</span> DAFTAR PRODUK</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedProducts />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedProducts() {
  await requireFeatureAccess("products");
  return <ProductsManagement />;
}
