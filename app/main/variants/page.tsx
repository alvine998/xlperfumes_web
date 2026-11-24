import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { VariantsManagement } from "./variants-management";
import "../../../styles/dashboard.css";
import "../../../styles/variants.css";

export const metadata: Metadata = {
  title: "Daftar Varian | XL Perfumes",
  description: "Kelola varian per cabang, jumlah, satuan, dan harga satuan.",
};

export default function VariantsPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">INVENTARIS <span>/</span> DAFTAR VARIAN</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedVariants />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedVariants() {
  await requireFeatureAccess("variants");
  return <VariantsManagement />;
}
