import type { Metadata } from "next";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, LayoutDashboard, MapPin, Package, Store, UsersRound } from "lucide-react";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { NotificationModal } from "./notification-modal";
import { TodayLabel } from "./today-label";
import { ProfileMenu } from "../profile-menu";
import "../../../styles/dashboard.css";

export const metadata: Metadata = {
  title: "Ringkasan Statistik | XL Perfumes",
  description: "Pantau status inventaris dan statistik varian terjual di seluruh cabang XL Perfumes.",
};

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Navigasi utama">
        <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
          <span className="dashboard-brand-mark">XL</span>
          <span>PERFUMES</span>
        </Link>

        <div className="sidebar-label">MANAJEMEN</div>
        <nav className="dashboard-nav">
          <a className="dashboard-nav-link is-active" href="#overview" aria-current="page"><span className="nav-icon"><LayoutDashboard aria-hidden="true" /></span>Ringkasan</a>
          <a className="dashboard-nav-link" href="#stats"><span className="nav-icon"><Package aria-hidden="true" /></span>Status Stok</a>
          <a className="dashboard-nav-link" href="#sales"><span className="nav-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>Penjualan</a>
          <a className="dashboard-nav-link" href="#filters"><span className="nav-icon"><MapPin aria-hidden="true" /></span>Filter Cabang</a>
          <Link className="dashboard-nav-link" href="/main/stores"><span className="nav-icon"><Store aria-hidden="true" /></span>Daftar Toko</Link>
          <Link className="dashboard-nav-link" href="/main/users"><span className="nav-icon"><UsersRound aria-hidden="true" /></span>Pengguna</Link>
        </nav>

        {/* <div className="sidebar-note">
          <span className="sidebar-note-mark">✳</span>
          <p>Data yang jelas.<br />Keputusan yang lebih baik.</p>
        </div> */}
        {/* <div className="sidebar-foot"><span className="sidebar-status-dot" /> SISTEM OPERASIONAL</div> */}
      </aside>

      <div className="dashboard-main" id="overview">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> RINGKASAN</div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationModal />
            <ProfileMenu />
          </div>
        </header>

        <AnalyticsDashboard />
      </div>
    </main>
  );
}

