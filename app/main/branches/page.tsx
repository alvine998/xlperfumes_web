import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { BranchesManagement } from "./branches-management";
import "../../../styles/dashboard.css";
import "../../../styles/branches.css";

export const metadata: Metadata = {
  title: "Daftar Cabang | XL Perfumes",
  description: "Kelola daftar cabang, kota, dan alamat XL Perfumes.",
};

export default function BranchesPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> DAFTAR CABANG
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedBranches />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedBranches() {
  await requireFeatureAccess("stores");
  return <BranchesManagement />;
}
