"use client";

import { useMemo, useState } from "react";
import { VariantSalesChart } from "./variant-sales-chart";

const branches = [
  { value: "all", label: "Semua Cabang", multiplier: 1 },
  { value: "jakarta", label: "Jakarta Selatan", multiplier: 0.38 },
  { value: "bandung", label: "Bandung", multiplier: 0.24 },
  { value: "surabaya", label: "Surabaya", multiplier: 0.2 },
  { value: "yogyakarta", label: "Yogyakarta", multiplier: 0.11 },
  { value: "medan", label: "Medan", multiplier: 0.07 },
] as const;
type BranchValue = (typeof branches)[number]["value"];

const statusMetrics = [
  { label: "Pending", key: "pending", value: 126, note: "Menunggu diproses", color: "amber" },
  { label: "Di Gudang", key: "warehouse", value: 384, note: "Stok tersimpan", color: "blue" },
  { label: "Di SPG", key: "spg", value: 92, note: "Dibawa oleh SPG", color: "violet" },
  { label: "Di Toko", key: "store", value: 218, note: "Siap dijual", color: "green" },
  { label: "Collecting", key: "collecting", value: 34, note: "Dalam pengumpulan", color: "teal" },
  { label: "Terjual", key: "sold", value: 567, note: "Dalam periode terpilih", color: "olive" },
  { label: "Rusak", key: "damaged", value: 12, note: "Perlu tindak lanjut", color: "red" },
] as const;

const variantData = [
  { label: "XL Oud", value: 148 },
  { label: "XL Musk", value: 126 },
  { label: "XL No. 08", value: 112 },
  { label: "XL Bloom", value: 94 },
  { label: "XL Amber", value: 87 },
] as const;

const initialStartDate = "2026-11-01";
const initialEndDate = "2026-11-17";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function getDayCount(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [branch, setBranch] = useState<BranchValue>("all");
  const selectedBranch = branches.find((item) => item.value === branch) ?? branches[0];
  const periodDays = getDayCount(startDate, endDate);
  const periodFactor = Math.min(periodDays / 30, 1.5);

  const metrics = useMemo(() => statusMetrics.map((metric) => {
    const factor = metric.key === "sold" ? periodFactor : Math.max(periodFactor, 0.2);
    return { ...metric, count: Math.round(metric.value * selectedBranch.multiplier * factor) };
  }), [periodFactor, selectedBranch]);

  const soldVariants = useMemo(() => variantData.map((variant) => ({
    ...variant,
    count: Math.round(variant.value * selectedBranch.multiplier * periodFactor),
  })), [periodFactor, selectedBranch]);

  const hasValidPeriod = Boolean(startDate && endDate && startDate <= endDate);

  function handleBranchChange(value: string) {
    const selected = branches.find((item) => item.value === value);
    if (selected) setBranch(selected.value);
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading" aria-labelledby="dashboard-title">
        <div>
          <span className="dashboard-eyebrow">PUSAT KONTROL OPERASIONAL</span>
          <h1 id="dashboard-title">Ringkasan Statistik</h1>
          <p>Pantau pergerakan stok dan penjualan seluruh cabang.</p>
        </div>
        <div className="report-updated"><span className="live-indicator" /> DATA CONTOH <span className="updated-divider">·</span> DIPERBARUI HARI INI</div>
      </section>

      <section className="dashboard-filters" id="filters" aria-label="Filter statistik">
        <div className="filter-heading"><span className="filter-icon"><FilterIcon /></span><div><strong>Filter laporan</strong><small>Sesuaikan periode dan cabang</small></div></div>
        <div className="filter-controls">
          <label className="filter-field"><span>Tanggal mulai</span><input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <span className="date-separator" aria-hidden="true">—</span>
          <label className="filter-field"><span>Tanggal akhir</span><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="filter-field branch-field"><span>Cabang</span><select value={branch} onChange={(event) => handleBranchChange(event.target.value)}>{branches.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
      </section>

      {!hasValidPeriod && <p className="filter-error" role="alert">Tanggal mulai tidak boleh melewati tanggal akhir.</p>}

      <section className="status-section" id="stats" aria-labelledby="status-heading">
        <div className="section-heading"><div><span className="dashboard-eyebrow">POSISI INVENTARIS</span><h2 id="status-heading">Statistik Status Barang</h2></div><span className="period-caption">{periodDays} hari <i>·</i> {selectedBranch.label}</span></div>
        <div className="status-grid">
          {metrics.map((metric) => <article className={`status-card status-${metric.color}`} key={metric.key}><div className="status-card-top"><span className="status-dot" /><span className="status-card-label">{metric.label}</span><span className="status-more" aria-hidden="true">↗</span></div><strong className="status-count">{formatNumber(hasValidPeriod ? metric.count : 0)}<small> unit</small></strong><span className="status-note">{metric.note}</span></article>)}
        </div>
      </section>

      <section className="sales-section" id="sales" aria-labelledby="sales-heading">
        <div className="section-heading sales-heading"><div><span className="dashboard-eyebrow">RINGKASAN PENJUALAN</span><h2 id="sales-heading">Statistik Varian Terjual</h2></div><div className="chart-period"><CalendarIcon /><span>{formatShortDate(startDate)} — {formatShortDate(endDate)}</span></div></div>
        <p className="sales-description">Jumlah unit terjual per varian untuk <strong>{selectedBranch.label}</strong>.</p>
        <VariantSalesChart data={hasValidPeriod ? soldVariants : soldVariants.map((item) => ({ ...item, count: 0 }))} />
        <div className="chart-footnote"><span>DATA CONTOH</span><span>Jumlah dalam unit</span></div>
      </section>

      <footer className="dashboard-footer"><span>XL PERFUMES <i>·</i> RINGKASAN OPERASIONAL</span><span>© 2026 XL PERFUMES</span></footer>
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function FilterIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="10" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
