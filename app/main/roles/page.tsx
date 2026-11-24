import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { RolesManagement } from "./roles-management";
import "../../../styles/dashboard.css";
import "../../../styles/roles.css";

export const metadata: Metadata = {
  title: "Akses Peran | XL Perfumes",
  description: "Atur akses fitur untuk setiap peran di XL Perfumes.",
};

export default function RolesPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> AKSES PERAN</div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedRoles />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedRoles() {
  await requireFeatureAccess("roles");
  return <RolesManagement />;
}
