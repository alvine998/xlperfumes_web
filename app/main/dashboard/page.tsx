import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireAnyFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { NotificationDropdown } from "./notification-dropdown";
import { TodayLabel } from "./today-label";
import { ProfileMenu } from "../profile-menu";
import "../../../styles/dashboard.css";

export const metadata: Metadata = {
  title: "Ringkasan Statistik | XL Perfumes",
  description:
    "Pantau status inventaris dan statistik varian terjual di seluruh cabang XL Perfumes.",
};

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />

      <div className="dashboard-main" id="overview">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> RINGKASAN
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>

        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedDashboard />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedDashboard() {
  const permissions = await requireAnyFeatureAccess(["overview", "inventory", "sales"]);
  return <AnalyticsDashboard permissions={permissions} />;
}
