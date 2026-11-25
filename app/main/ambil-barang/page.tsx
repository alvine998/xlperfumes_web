import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireRoleAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { WarehouseMovementForm } from "../warehouse-stock/movement/[direction]/warehouse-movement-form";
import "../../../styles/dashboard.css";
import "../../../styles/store-stock.css";
import "../../../styles/warehouse-stock.css";
import "../../../styles/ambil-barang.css";

export const metadata: Metadata = {
  title: "Ambil Barang | XL Perfumes",
  description: "Pindahkan barang dari gudang ke stok SPG atau Collecting.",
};

export default function AmbilBarangPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> AMBIL BARANG</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedPickup />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedPickup() {
  const role = await requireRoleAccess(["spg", "collecting"]);
  return <WarehouseMovementForm direction="pickup" pickupDestination={role === "spg" ? "Di SPG" : "Di Collecting"} />;
}
