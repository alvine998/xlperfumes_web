import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { StoresManagement } from "./stores-management";
import "../../../styles/dashboard.css";
import "../../../styles/stores.css";

export const metadata: Metadata = {
  title: "Daftar Toko | XL Perfumes",
  description: "Kelola daftar toko, lokasi cabang, dan QR toko XL Perfumes.",
};

export default function StoresPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> DAFTAR TOKO
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedStores />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStores() {
  await requireFeatureAccess("stores");
  return <StoresManagement />;
}
