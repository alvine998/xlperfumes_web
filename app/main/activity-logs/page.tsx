import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../main-content-loading";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { ActivityLogs } from "./activity-logs";
import "../../../styles/dashboard.css";
import "../../../styles/activity-logs.css";

export const metadata: Metadata = {
  title: "Log Aktivitas | XL Perfumes",
  description: "Pantau riwayat aktivitas administrator XL Perfumes.",
};

export default function ActivityLogsPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> LOG AKTIVITAS</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedActivityLogs />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedActivityLogs() {
  await requireFeatureAccess("activity");
  return <ActivityLogs />;
}
