import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MainSidebar } from "../../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../../main-content-loading";
import { NotificationDropdown } from "../../dashboard/notification-dropdown";
import { TodayLabel } from "../../dashboard/today-label";
import { ProfileMenu } from "../../profile-menu";
import { ZoneDetail } from "../zone-detail";
import "leaflet/dist/leaflet.css";
import "../../../../styles/dashboard.css";
import "../../../../styles/zones.css";

export const metadata: Metadata = {
  title: "Detail Zona | XL Perfumes",
  description: "Kelola anggota, toko, dan rute operasional zona XL Perfumes.",
};

type ZoneDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ZoneDetailPage({ params }: ZoneDetailPageProps) {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            OPERASIONAL <span>/</span> DAFTAR ZONA <span>/</span> DETAIL ZONA
          </div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <ZoneDetailContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function ZoneDetailContent({ params }: ZoneDetailPageProps) {
  const { id } = await params;
  const zoneId = Number(id);
  if (!Number.isInteger(zoneId) || zoneId < 1) notFound();

  return <AuthorizedZoneDetail zoneId={zoneId} />;
}

async function AuthorizedZoneDetail({ zoneId }: { zoneId: number }) {
  await requireFeatureAccess("zonas");
  return <ZoneDetail zoneId={zoneId} />;
}
