import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { ProductBarcodes } from "./product-barcodes";
import "../../../styles/dashboard.css";
import "../../../styles/product-barcodes.css";

export const metadata: Metadata = {
  title: "Cetak Barcode Produk | XL Perfumes",
  description: "Pilih dan cetak kode QR produk XL Perfumes berdasarkan cabang, varian, dan tanggal dibuat.",
};

export default function ProductBarcodesPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">INVENTARIS <span>/</span> CETAK BARCODE PRODUK</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedProductBarcodes />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedProductBarcodes() {
  await requireFeatureAccess("inventory");
  return <ProductBarcodes />;
}
