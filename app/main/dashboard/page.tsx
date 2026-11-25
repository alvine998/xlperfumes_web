import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MainSidebar } from "../main-sidebar";
import { getCurrentUserContext } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { RoleDashboard } from "./role-dashboard";
import { NotificationDropdown } from "./notification-dropdown";
import { TodayLabel } from "./today-label";
import { ProfileMenu } from "../profile-menu";
import "../../../styles/dashboard.css";
import "../../../styles/operational-dashboard.css";

export const metadata: Metadata = {
  title: "Ringkasan Operasional | XL Perfumes",
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
  const { permissions, role } = await getCurrentUserContext();
  if (!permissions.overview) notFound();
  if (role === "admin" || role === "owner") {
    return <AnalyticsDashboard permissions={permissions} />;
  }
  return <RoleDashboard role={role} permissions={permissions} />;
}
