import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { UsersManagement } from "./users-management";
import "../../../styles/dashboard.css";
import "../../../styles/users.css";

export const metadata: Metadata = {
  title: "Manajemen Pengguna | XL Perfumes",
  description: "Kelola akun, peran, dan akses pengguna XL Perfumes.",
};

export default function UsersPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> PENGGUNA
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>

        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedUsers />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedUsers() {
  await requireFeatureAccess("users");
  return <UsersManagement />;
}
