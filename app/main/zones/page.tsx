import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { ZonesManagement } from "./zones-management";
import "../../../styles/dashboard.css";
import "../../../styles/zones.css";

export const metadata: Metadata = {
  title: "Daftar Zona | XL Perfumes",
  description: "Kelola zona dan cabang operasional XL Perfumes.",
};

export default function ZonesPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> DAFTAR ZONA
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedZones />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedZones() {
  await requireFeatureAccess("zonas");
  return <ZonesManagement />;
}
