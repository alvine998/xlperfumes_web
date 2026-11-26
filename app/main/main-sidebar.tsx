"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  BadgeDollarSign,
  Route,
  Layers,
  LayoutDashboard,
  Menu,
  X,
  MapPin,
  Clipboard,
  Package,
  PackagePlus,
  QrCode,
  Warehouse,
  ShieldCheck,
  Store,
  Printer,
  PackageCheck,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { isFeaturePermissions, type FeatureKey, type FeaturePermissions } from "@/lib/permissions";
import { isUserRole, type UserRole } from "@/lib/users";

const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; feature?: FeatureKey; roles?: readonly UserRole[]; Icon: LucideIcon }[];
}[] = [
  {
    label: "RINGKASAN",
    items: [
      { href: "/main/dashboard", label: "Ringkasan", feature: "overview", Icon: LayoutDashboard },
    ],
  },
  {
    label: "INVENTARIS",
    items: [
      { href: "/main/store-stock", label: "Stok Toko", feature: "store_inventory", Icon: Package },
      { href: "/main/warehouse-stock", label: "Stok Gudang", feature: "warehouse_inventory", Icon: Warehouse },
      { href: "/main/ambil-barang", label: "Ambil Barang", roles: ["spg", "collecting"], Icon: PackageCheck },
      { href: "/main/variants", label: "Daftar Varian", feature: "variants", Icon: Tags },
      { href: "/main/products", label: "Daftar Produk", feature: "products", Icon: Clipboard },
      { href: "/main/laporan-penjualan", label: "Laporan Penjualan", feature: "products", roles: ["admin", "owner"], Icon: BadgeDollarSign },
      { href: "/main/products/generate", label: "Generate Produk", feature: "generate_product", Icon: PackagePlus },
      { href: "/main/product-barcodes", label: "Cetak Barcode Produk", feature: "print_product_barcodes", Icon: QrCode },
    ],
  },
  {
    label: "JARINGAN TOKO",
    items: [
      { href: "/main/branches", label: "Daftar Cabang", feature: "branchs", Icon: MapPin },
      { href: "/main/zones", label: "Daftar Zona", feature: "zonas", Icon: Layers },
      { href: "/main/stores", label: "Daftar Toko", feature: "stores", Icon: Store },
      { href: "/main/kunjungan-toko", label: "Kunjungan Toko", feature: "store_visit", Icon: ClipboardCheck },
      { href: "/main/rute-toko", label: "Rute Toko", feature: "store_visit", roles: ["collecting", "spg"], Icon: Route },
      { href: "/main/store-barcodes", label: "Cetak Barcode Toko", feature: "print_store_barcodes", Icon: Printer },
    ],
  },
  {
    label: "ADMINISTRASI",
    items: [
      { href: "/main/users", label: "Pengguna", feature: "users", Icon: UsersRound },
      { href: "/main/roles", label: "Akses Peran", feature: "roles", Icon: ShieldCheck },
      { href: "/main/activity-logs", label: "Log Aktivitas", feature: "activity_logs", Icon: ClipboardList },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function MainSidebar() {
  return (
    <Suspense fallback={<MainSidebarLoading />}>
      <MainSidebarContent />
    </Suspense>
  );
}

function MainSidebarContent() {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<FeaturePermissions | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;

  useEffect(() => {
    let active = true;
    getApi("/auth/me").then(({ data }) => {
      if (!active || !isRecord(data) || !isRecord(data.user)) return;
      if (isFeaturePermissions(data.user.permissions)) setPermissions(data.user.permissions);
      if (isUserRole(data.user.role)) setRole(data.user.role);
    }).catch(() => {
      if (active) setPermissions(null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuPath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const isFieldRole = role === "spg" || role === "collecting";
  const visibleGroups = permissions ? NAV_GROUPS.map(({ label, items }) => ({
    label,
    items: items.filter(({ feature, roles }) =>
      (!roles || (role !== null && roles.includes(role))) &&
      (!feature || permissions[feature])),
  })).filter(({ items }) => items.length > 0) : [];
  const primaryHrefs = ["/main/dashboard", "/main/ambil-barang", "/main/rute-toko", "/main/kunjungan-toko"];
  const primaryItems = visibleGroups.flatMap(({ items }) => items).filter(({ href }) => primaryHrefs.includes(href));
  const isExtraActive = !primaryHrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside className={`dashboard-sidebar${isFieldRole ? " field-sidebar" : ""}`} aria-label="Navigasi utama">
      <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
        <span className="dashboard-brand-mark">XL</span>
        <span>PERFUMES</span>
      </Link>
      <nav className="dashboard-nav" aria-label="Fitur">
        {permissions ? visibleGroups.map(({ label: groupLabel, items: visibleItems }) => (
            <div className="dashboard-nav-group" role="group" aria-label={groupLabel} key={groupLabel}>
              <span className="dashboard-nav-group-label" aria-hidden="true">{groupLabel}</span>
              {visibleItems.map(({ href, label, Icon }) => {
                const active = href === pathname || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    className={`dashboard-nav-link${active ? " is-active" : ""}`}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    key={href}
                  >
                    <span className="nav-icon"><Icon aria-hidden="true" /></span>
                    {label}
                  </Link>
                );
              })}
            </div>
          )) : <SidebarLoadingStatus />}
      </nav>
      {isFieldRole && permissions && <>
        <nav className="field-bottom-nav" aria-label="Navigasi lapangan">
          {primaryItems.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link className={`field-bottom-link${active ? " is-active" : ""}`} href={href} aria-current={active ? "page" : undefined} key={href}><Icon aria-hidden="true" /><span>{label}</span></Link>;
          })}
          <button className={`field-bottom-link${menuOpen || isExtraActive ? " is-active" : ""}`} type="button" onClick={() => setMenuPath(menuOpen ? null : pathname)} aria-expanded={menuOpen} aria-controls={menuOpen ? "field-menu" : undefined}><Menu aria-hidden="true" /><span>Menu</span></button>
        </nav>
        {menuOpen && <div className="field-menu-layer">
          <button className="field-menu-backdrop" type="button" aria-label="Tutup menu" onClick={() => setMenuPath(null)} />
          <nav className="field-menu-panel" id="field-menu" aria-label="Semua fitur">
            <div className="field-menu-heading"><strong>Semua fitur</strong><button type="button" aria-label="Tutup menu" onClick={() => setMenuPath(null)}><X aria-hidden="true" /></button></div>
            {visibleGroups.map(({ label, items }) => <div className="field-menu-group" key={label}><span>{label}</span>{items.map(({ href, label: itemLabel, Icon }) => <Link href={href} key={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} onClick={() => setMenuPath(null)}><Icon aria-hidden="true" />{itemLabel}</Link>)}</div>)}
          </nav>
        </div>}
      </>}
    </aside>
  );
}

function MainSidebarLoading() {
  return (
    <aside className="dashboard-sidebar" aria-label="Navigasi utama">
      <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
        <span className="dashboard-brand-mark">XL</span>
        <span>PERFUMES</span>
      </Link>
      <nav className="dashboard-nav" aria-label="Fitur">
        <SidebarLoadingStatus />
      </nav>
    </aside>
  );
}

function SidebarLoadingStatus() {
  return <span className="dashboard-nav-loading" role="status">Memuat akses…</span>;
}
