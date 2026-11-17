import type { Metadata } from "next";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, LayoutDashboard, MapPin, Package, UsersRound } from "lucide-react";
import { NotificationModal } from "../dashboard/notification-modal";
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
      <aside className="dashboard-sidebar" aria-label="Navigasi utama">
        <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
          <span className="dashboard-brand-mark">XL</span>
          <span>PERFUMES</span>
        </Link>

        <div className="sidebar-label">MANAJEMEN</div>
        <nav className="dashboard-nav">
          <Link className="dashboard-nav-link" href="/main/dashboard"><span className="nav-icon"><LayoutDashboard aria-hidden="true" /></span>Ringkasan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#stats"><span className="nav-icon"><Package aria-hidden="true" /></span>Status Stok</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#sales"><span className="nav-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>Penjualan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#filters"><span className="nav-icon"><MapPin aria-hidden="true" /></span>Filter Cabang</Link>
          <Link className="dashboard-nav-link is-active" href="/main/users" aria-current="page"><span className="nav-icon"><UsersRound aria-hidden="true" /></span>Pengguna</Link>
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> PENGGUNA</div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationModal />
            <ProfileMenu />
          </div>
        </header>

        <UsersManagement />
      </div>
    </main>
  );
}

