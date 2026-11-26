"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CircleAlert,
  ClipboardCheck,
  Package,
  PackageCheck,
  RefreshCw,
  Route,
  ShoppingBag,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { getApi, getApiError } from "@/lib/api";
import type { FeaturePermissions } from "@/lib/permissions";
import type { UserRole } from "@/lib/users";

type OperationalRole = Extract<UserRole, "spg" | "gudang" | "collecting">;
type StatusKey = "pending" | "di_gudang" | "di_toko" | "di_spg" | "di_collecting" | "terjual" | "rusak";
type OperationalSummary = {
  role: OperationalRole;
  branchId: number | null;
  branch: string | null;
  statusCounts: Record<StatusKey, number>;
};
type Metric = { key: StatusKey; label: string; note: string; color: string; Icon: LucideIcon };
type Action = { href: string; title: string; description: string; Icon: LucideIcon; color: string };
type AssignedZoneSummary = { id: number; name: string; branch: string | null; stores: { id: number; name: string }[] };

const STATUS_KEYS: StatusKey[] = ["pending", "di_gudang", "di_toko", "di_spg", "di_collecting", "terjual", "rusak"];
const METRICS: Record<OperationalRole, Metric[]> = {
  gudang: [
    { key: "pending", label: "Menunggu masuk", note: "Barang yang perlu diterima", color: "amber", Icon: ArrowDownToLine },
    { key: "di_gudang", label: "Stok di gudang", note: "Unit tersedia di cabang", color: "blue", Icon: Warehouse },
    { key: "di_toko", label: "Sudah ke toko", note: "Unit telah keluar dari gudang", color: "teal", Icon: ArrowUpFromLine },
    { key: "rusak", label: "Barang rusak", note: "Perlu tindak lanjut", color: "red", Icon: CircleAlert },
  ],
  spg: [
    { key: "di_gudang", label: "Siap diambil", note: "Tersedia di gudang cabang", color: "blue", Icon: PackageCheck },
    { key: "di_spg", label: "Stok SPG cabang", note: "Unit berstatus Di SPG", color: "violet", Icon: Package },
    { key: "terjual", label: "Terjual di cabang", note: "Unit berstatus Terjual", color: "green", Icon: ShoppingBag },
  ],
  collecting: [
    { key: "di_gudang", label: "Siap diambil", note: "Tersedia di gudang cabang", color: "blue", Icon: PackageCheck },
    { key: "di_collecting", label: "Dalam collecting", note: "Unit berstatus Di Collecting", color: "teal", Icon: Boxes },
    { key: "terjual", label: "Terjual di cabang", note: "Unit berstatus Terjual", color: "green", Icon: ShoppingBag },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOperationalSummary(value: unknown): value is OperationalSummary {
  if (!isRecord(value) || !isRecord(value.statusCounts)) return false;
  const statusCounts = value.statusCounts;
  return (value.role === "spg" || value.role === "gudang" || value.role === "collecting") &&
    (typeof value.branchId === "number" || value.branchId === null) &&
    (typeof value.branch === "string" || value.branch === null) &&
    STATUS_KEYS.every((key) => typeof statusCounts[key] === "number" && Number.isFinite(statusCounts[key]));
}

function roleLabel(role: OperationalRole) {
  if (role === "gudang") return "Gudang";
  if (role === "spg") return "SPG";
  return "Collecting";
}

function roleDescription(role: OperationalRole) {
  if (role === "gudang") return "Kelola penerimaan, persediaan gudang, dan tindak lanjut barang rusak.";
  if (role === "spg") return "Pantau persediaan cabang dan ambil barang yang akan dibawa ke lapangan.";
  return "Pantau barang collecting dan mulai kunjungan ke toko.";
}

function getActions(role: OperationalRole, permissions: FeaturePermissions): Action[] {
  const actions: Action[] = [];
  if (role === "gudang" && permissions.warehouse_inventory) {
    actions.push(
      { href: "/main/warehouse-stock", title: "Stok Gudang", description: "Lihat persediaan per varian dan cabang.", color: "blue", Icon: Warehouse },
      { href: "/main/warehouse-stock/movement/in", title: "Barang Masuk", description: "Terima produk ke dalam gudang.", color: "green", Icon: ArrowDownToLine },
      { href: "/main/warehouse-stock/movement/out", title: "Barang Keluar", description: "Proses barang keluar dari gudang.", color: "orange", Icon: ArrowUpFromLine },
    );
  }
  if (role === "spg" || role === "collecting") {
    actions.push({ href: "/main/ambil-barang", title: "Ambil Barang", description: "Pindai barang gudang ke stok sesuai peran Anda.", color: "violet", Icon: PackageCheck });
  }
  if (role !== "gudang" && permissions.products) {
    actions.push({ href: "/main/products", title: "Daftar Produk", description: "Cari produk dan lihat status barang cabang.", color: "blue", Icon: Package });
  }
  if (permissions.store_visit) {
    if (role === "spg" || role === "collecting") {
      actions.push({ href: "/main/rute-toko", title: "Rute Toko", description: "Lihat zona tugas dan susun urutan kunjungan.", color: "green", Icon: Route });
    }
    actions.push({ href: "/main/kunjungan-toko", title: "Kunjungan Toko", description: "Mulai kunjungan dan catat aktivitas toko.", color: "teal", Icon: ClipboardCheck });
  }
  return actions;
}

export function RoleDashboard({ role, permissions }: { role: OperationalRole; permissions: FeaturePermissions }) {
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<number | null>(null);
  const [assignedZones, setAssignedZones] = useState<AssignedZoneSummary[]>([]);
  const [zonesError, setZonesError] = useState("");
  const [zonesLoading, setZonesLoading] = useState(true);
  const loading = loadedRequest !== retryCount;
  const actions = getActions(role, permissions);

  useEffect(() => {
    let active = true;
    getApi("/products/dashboard-summary")
      .then(({ data }) => {
        if (!isOperationalSummary(data) || data.role !== role) throw new Error("Ringkasan operasional dari API tidak valid.");
        if (active) {
          setSummary(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(getApiError(cause));
      })
      .finally(() => {
        if (active) setLoadedRequest(retryCount);
      });
    return () => { active = false; };
  }, [role, retryCount]);

  useEffect(() => {
    if (role === "gudang" || !permissions.store_visit) return;
    let active = true;
    getApi("/zones/my")
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.zones)) throw new Error("Data zona dari API tidak valid.");
        const zones = data.zones.filter((zone): zone is AssignedZoneSummary =>
          isRecord(zone) && typeof zone.id === "number" && typeof zone.name === "string" &&
          (typeof zone.branch === "string" || zone.branch === null) && Array.isArray(zone.stores) &&
          zone.stores.every((store) => isRecord(store) && typeof store.id === "number" && typeof store.name === "string"),
        );
        if (zones.length !== data.zones.length) throw new Error("Data zona dari API tidak valid.");
        if (active) { setAssignedZones(zones); setZonesError(""); }
      })
      .catch((cause: unknown) => { if (active) setZonesError(getApiError(cause)); })
      .finally(() => { if (active) setZonesLoading(false); });
    return () => { active = false; };
  }, [role, permissions.store_visit]);

  const branchLabel = summary?.branch ?? (summary?.branchId === null ? "Semua Cabang" : summary?.branchId ? `Cabang ${summary.branchId}` : "Memuat cabang…");

  return (
    <div className="dashboard-content role-dashboard">
      <section className="dashboard-heading role-dashboard-heading" aria-labelledby="role-dashboard-title">
        <div>
          <span className="dashboard-eyebrow">DASHBOARD OPERASIONAL · {roleLabel(role).toUpperCase()}</span>
          <h1 id="role-dashboard-title">Ringkasan {roleLabel(role)}</h1>
          <p>{roleDescription(role)}</p>
        </div>
        <div className="role-dashboard-branch"><Warehouse aria-hidden="true" /><span>{branchLabel}</span></div>
      </section>

      {error && <div className="role-dashboard-error" role="alert"><span>Ringkasan gagal dimuat: {error}</span><button type="button" onClick={() => setRetryCount((value) => value + 1)}><RefreshCw aria-hidden="true" /> Coba lagi</button></div>}
      {loading && <p className="role-dashboard-loading" role="status">Memuat statistik cabang…</p>}

      <section className="role-dashboard-metrics" aria-label={`Statistik operasional ${roleLabel(role)}`}>
        {METRICS[role].map(({ key, label, note, color, Icon }) => (
          <article className={`role-dashboard-metric metric-${color}`} key={key}>
            <span className="role-dashboard-metric-icon"><Icon aria-hidden="true" /></span>
            <span className="role-dashboard-metric-label">{label}</span>
            <strong>{summary ? new Intl.NumberFormat("id-ID").format(summary.statusCounts[key]) : "—"}<small> unit</small></strong>
            <span className="role-dashboard-metric-note">{note}</span>
          </article>
        ))}
      </section>

      <section className="role-dashboard-actions" aria-labelledby="role-dashboard-actions-title">
        <header><div><span className="dashboard-eyebrow">AKSES CEPAT</span><h2 id="role-dashboard-actions-title">Tugas operasional</h2></div><span className="role-dashboard-actions-count">{actions.length} fitur</span></header>
        {actions.length ? <div className="role-dashboard-action-grid">{actions.map(({ href, title, description, color, Icon }) => (
          <Link className={`role-dashboard-action action-${color}`} href={href} key={href}>
            <span className="role-dashboard-action-icon"><Icon aria-hidden="true" /></span>
            <span className="role-dashboard-action-copy"><strong>{title}</strong><small>{description}</small></span>
            <ArrowRight className="role-dashboard-action-arrow" aria-hidden="true" />
          </Link>
        ))}</div> : <p className="role-dashboard-no-actions">Belum ada akses fitur operasional untuk akun ini.</p>}
      </section>
      {role !== "gudang" && permissions.store_visit && (
        <section className="role-dashboard-actions collecting-zones" aria-labelledby="collecting-zones-title">
          <header><div><span className="dashboard-eyebrow">WILAYAH TUGAS</span><h2 id="collecting-zones-title">Zona toko Anda</h2></div><Link href="/main/rute-toko">Lihat rute toko <ArrowRight aria-hidden="true" /></Link></header>
          {zonesLoading ? <p className="role-dashboard-loading" role="status">Memuat zona toko Anda…</p> : zonesError ? <p className="role-dashboard-error" role="alert">Zona toko gagal dimuat: {zonesError}</p> : assignedZones.length ? (
            <ul>{assignedZones.map((zone) => <li key={zone.id}><span><strong>{zone.name}</strong><small>{zone.branch ?? "Cabang"} · {zone.stores.length} toko</small></span><Link href={`/main/rute-toko?zoneId=${zone.id}`}>Lihat zona</Link></li>)}</ul>
          ) : <p className="role-dashboard-loading" role="status">Belum ada zona toko yang ditugaskan kepada Anda.</p>}
        </section>
      )}
      <DashboardFooter section={`RINGKASAN ${roleLabel(role).toUpperCase()}`} />
    </div>
  );
}
