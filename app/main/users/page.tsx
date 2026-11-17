import type { Metadata } from "next";
import Link from "next/link";
import { NotificationModal } from "../dashboard/notification-modal";
import { TodayLabel } from "../dashboard/today-label";
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
          <Link className="dashboard-nav-link" href="/main/dashboard"><span className="nav-icon"><OverviewIcon /></span>Ringkasan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#stats"><span className="nav-icon"><InventoryIcon /></span>Status Stok</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#sales"><span className="nav-icon"><SalesIcon /></span>Penjualan</Link>
          <Link className="dashboard-nav-link" href="/main/dashboard#filters"><span className="nav-icon"><BranchIcon /></span>Filter Cabang</Link>
          <Link className="dashboard-nav-link is-active" href="/main/users" aria-current="page"><span className="nav-icon"><UsersIcon /></span>Pengguna</Link>
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">OPERASIONAL <span>/</span> PENGGUNA</div>
          <div className="topbar-right">
            <TodayLabel />
            <NotificationModal />
            <details className="profile-dropdown">
              <summary className="topbar-profile" aria-label="Buka menu profil Alex Morgan">
                <span className="profile-avatar" aria-hidden="true">A</span>
                <span className="topbar-profile-copy"><strong>Alex Morgan</strong><small>Administrator</small></span>
                <span className="topbar-profile-menu" aria-hidden="true">⌄</span>
              </summary>
              <div className="profile-dropdown-panel">
                <div className="profile-dropdown-heading"><span className="profile-avatar" aria-hidden="true">A</span><span><strong>Alex Morgan</strong><small>Administrator</small></span></div>
                <a href="#profile">Profil saya</a>
                <Link href="/">Keluar</Link>
              </div>
            </details>
          </div>
        </header>

        <UsersManagement />
      </div>
    </main>
  );
}

function OverviewIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="3" width="5.5" height="5.5" rx=".5" stroke="currentColor" strokeWidth="1.3"/><rect x="11.5" y="3" width="5.5" height="5.5" rx=".5" stroke="currentColor" strokeWidth="1.3"/><rect x="3" y="11.5" width="5.5" height="5.5" rx=".5" stroke="currentColor" strokeWidth="1.3"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx=".5" stroke="currentColor" strokeWidth="1.3"/></svg>;
}

function InventoryIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m3 6 7-3 7 3v8l-7 3-7-3V6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="m3.5 6.2 6.5 3 6.5-3M10 9.5V17" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}

function SalesIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 16.5h14M5 13V9m5 4V4m5 9V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function BranchIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17s5-4.4 5-9a5 5 0 1 0-10 0c0 4.6 5 9 5 9Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="10" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.3"/></svg>;
}

function UsersIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="7.5" cy="6.3" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.8 16c.4-2.7 2-4.1 4.7-4.1s4.3 1.4 4.7 4.1M13 4.2a2.4 2.4 0 0 1 0 4.7m1.2 3.1c1.8.5 2.8 1.8 3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
