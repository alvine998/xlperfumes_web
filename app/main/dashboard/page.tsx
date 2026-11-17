import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { TodayLabel } from "./today-label";
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
          <a className="dashboard-nav-link is-active" href="#overview" aria-current="page"><span className="nav-icon"><OverviewIcon /></span>Ringkasan</a>
          <a className="dashboard-nav-link" href="#stats"><span className="nav-icon"><InventoryIcon /></span>Status Stok</a>
          <a className="dashboard-nav-link" href="#sales"><span className="nav-icon"><SalesIcon /></span>Penjualan</a>
          <a className="dashboard-nav-link" href="#filters"><span className="nav-icon"><BranchIcon /></span>Filter Cabang</a>
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
            <button className="icon-button" type="button" aria-label="Notifikasi"><BellIcon /></button>
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

        <AnalyticsDashboard />
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

function BellIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15.5 8a5.5 5.5 0 0 0-11 0c0 6-2 6.5-2 7h15c0-.5-2-1-2-7ZM8 18h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
