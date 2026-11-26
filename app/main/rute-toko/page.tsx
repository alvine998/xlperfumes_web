import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess, requireRoleAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { RoutePlanner } from "./route-planner";
import "leaflet/dist/leaflet.css";
import "../../../styles/dashboard.css";
import "../../../styles/zones.css";
import "../../../styles/rute-toko.css";

export const metadata: Metadata = {
  title: "Rute Toko | XL Perfumes",
  description: "Susun rute toko di zona tugas Collecting dan SPG dari lokasi Anda saat ini.",
};

export default function StoreRoutePage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> RUTE TOKO</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}><AuthorizedStoreRoute /></Suspense>
      </div>
    </main>
  );
}

async function AuthorizedStoreRoute() {
  await requireRoleAccess(["collecting", "spg"]);
  await requireFeatureAccess("store_visit");
  return <RoutePlanner />;
}
