import type { Metadata } from "next";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, LayoutDashboard, MapPin, Package, Store as StoreIcon, UsersRound } from "lucide-react";
import { NotificationModal } from "../dashboard/notification-modal";
import { TodayLabel } from "../dashboard/today-label";
import { ProfileMenu } from "../profile-menu";
import { StoresManagement } from "./stores-management";
import "../../../styles/dashboard.css";
import "../../../styles/stores.css";

export const metadata: Metadata = {
  title: "Daftar Toko | XL Perfumes",
  description: "Kelola daftar toko, lokasi cabang, dan QR toko XL Perfumes.",
};

export default function StoresPage() {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Navigasi utama">
        <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
          <span className="dashboard-brand-mark">XL</span><span>PERFUMES</span>
        </Link>
        <div className="sidebar-label">MANAJEMEN</div>
        <nav className="dashboard-nav">
          <Link className="dashboard-nav-link" href="/main/dashboard"><span className="nav-icon"><LayoutDashboard aria-hidden="true" /></span>Ringkasan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#stats"><span className="nav-icon"><Package aria-hidden="true" /></span>Status Stok</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#sales"><span className="nav-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>Penjualan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#filters"><span className="nav-icon"><MapPin aria-hidden="true" /></span>Filter Cabang</Link>
          <Link className="dashboard-nav-link is-active" href="/main/stores" aria-current="page"><span className="nav-icon"><StoreIcon aria-hidden="true" /></span>Daftar Toko</Link>
          <Link className="dashboard-nav-link" href="/main/users"><span className="nav-icon"><UsersRound aria-hidden="true" /></span>Pengguna</Link>
        </nav>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> DAFTAR TOKO</div>
          <div className="topbar-right"><TodayLabel /><NotificationModal /><ProfileMenu /></div>
        </header>
        <StoresManagement />
      </div>
    </main>
  );
}
