import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MainSidebar } from "../../../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../../../main-content-loading";
import { NotificationDropdown } from "../../../dashboard/notification-dropdown";
import { TodayLabel } from "../../../dashboard/today-label";
import { ProfileMenu } from "../../../profile-menu";
import { WarehouseMovementForm } from "./warehouse-movement-form";
import "../../../../../styles/dashboard.css";
import "../../../../../styles/store-stock.css";
import "../../../../../styles/warehouse-stock.css";

export const metadata: Metadata = { title: "Pergerakan Barang | XL Perfumes" };

export default async function WarehouseMovementPage({ params }: { params: Promise<{ direction: string }> }) {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> STOK GUDANG</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedWarehouseMovement params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedWarehouseMovement({ params }: { params: Promise<{ direction: string }> }) {
  const { direction } = await params;
  if (direction !== "in" && direction !== "out") notFound();
  await requireFeatureAccess("warehouse_inventory");
  return <WarehouseMovementForm direction={direction} />;
}
