"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Filter } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { MonthlySalesChart } from "./monthly-sales-chart";
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
  {
    label: "Pending",
    key: "pending",
    value: 126,
    note: "Menunggu diproses",
    color: "amber",
  },
  {
    label: "Di Gudang",
    key: "warehouse",
    value: 384,
    note: "Stok tersimpan",
    color: "blue",
  },
  {
    label: "Di SPG",
    key: "spg",
    value: 92,
    note: "Dibawa oleh SPG",
    color: "violet",
  },
  {
    label: "Di Toko",
    key: "store",
    value: 218,
    note: "Siap dijual",
    color: "green",
  },
  {
    label: "Collecting",
    key: "collecting",
    value: 34,
    note: "Dalam pengumpulan",
    color: "teal",
  },
  {
    label: "Terjual",
    key: "sold",
    value: 567,
    note: "Dalam periode terpilih",
    color: "olive",
  },
  {
    label: "Rusak",
    key: "damaged",
    value: 12,
    note: "Perlu tindak lanjut",
    color: "red",
  },
] as const;

const variantData = [
  { label: "XL Oud", value: 148 },
  { label: "XL Musk", value: 126 },
  { label: "XL No. 08", value: 112 },
  { label: "XL Bloom", value: 94 },
  { label: "XL Amber", value: 87 },
] as const;

const initialStartDate = "2026-01-01";
const initialEndDate = "2026-11-17";
const monthlySalesSample = [
  1245, 1160, 1380, 1510, 1448, 1690, 1830, 1760, 1940, 2100, 1380, 2250,
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function getDayCount(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
}

function getMonthlySales(
  startDate: string,
  endDate: string,
  branchMultiplier: number,
) {
  if (!startDate || !endDate || startDate > endDate) return [];

  const startYear = Number(startDate.slice(0, 4));
  const startMonth = Number(startDate.slice(5, 7)) - 1;
  const endYear = Number(endDate.slice(0, 4));
  const endMonth = Number(endDate.slice(5, 7)) - 1;
  const firstDay = Number(startDate.slice(8, 10));
  const lastDay = Number(endDate.slice(8, 10));
  const months: { label: string; total: number }[] = [];

  for (
    let year = startYear, month = startMonth;
    year < endYear || (year === endYear && month <= endMonth);
  ) {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const rangeStartDay =
      year === startYear && month === startMonth ? firstDay : 1;
    const rangeEndDay =
      year === endYear && month === endMonth ? lastDay : daysInMonth;
    const selectedDays = Math.max(0, rangeEndDay - rangeStartDay + 1);
    const monthSample = monthlySalesSample[month] ?? 0;
    const monthCount = Math.round(
      monthSample * (selectedDays / daysInMonth) * branchMultiplier,
    );

    months.push({
      label: new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(year, month, 1))),
      total: monthCount,
    });

    if (month === 11) {
      year += 1;
      month = 0;
    } else {
      month += 1;
    }
  }

  return months;
}

export function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [branch, setBranch] = useState<BranchValue>("all");
  const selectedBranch =
    branches.find((item) => item.value === branch) ?? branches[0];
  const periodDays = getDayCount(startDate, endDate);
  const periodFactor = Math.min(periodDays / 30, 1.5);

  const metrics = useMemo(
    () =>
      statusMetrics.map((metric) => {
        const factor =
          metric.key === "sold" ? periodFactor : Math.max(periodFactor, 0.2);
        return {
          ...metric,
          count: Math.round(metric.value * selectedBranch.multiplier * factor),
        };
      }),
    [periodFactor, selectedBranch],
  );

  const soldVariants = useMemo(
    () =>
      variantData.map((variant) => ({
        ...variant,
        count: Math.round(
          variant.value * selectedBranch.multiplier * periodFactor,
        ),
      })),
    [periodFactor, selectedBranch],
  );
  const monthlySales = useMemo(
    () => getMonthlySales(startDate, endDate, selectedBranch.multiplier),
    [startDate, endDate, selectedBranch],
  );

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
        <div className="report-updated">
          <span className="live-indicator" /> DATA CONTOH{" "}
          <span className="updated-divider">·</span> DIPERBARUI HARI INI
        </div>
      </section>

      <section
        className="dashboard-filters"
        id="filters"
        aria-label="Filter statistik"
      >
        <div className="filter-heading">
          <span className="filter-icon">
            <Filter aria-hidden="true" />
          </span>
          <div>
            <strong>Filter laporan</strong>
            <small>Sesuaikan periode dan cabang</small>
          </div>
        </div>
        <div className="filter-controls">
          <label className="filter-field">
            <span>Tanggal mulai</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <span className="date-separator" aria-hidden="true">
            —
          </span>
          <label className="filter-field">
            <span>Tanggal akhir</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="filter-field branch-field">
            <span>Cabang</span>
            <select
              value={branch}
              onChange={(event) => handleBranchChange(event.target.value)}
            >
              {branches.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!hasValidPeriod && (
        <p className="filter-error" role="alert">
          Tanggal mulai tidak boleh melewati tanggal akhir.
        </p>
      )}

      <section
        className="status-section"
        id="stats"
        aria-labelledby="status-heading"
      >
        <div className="section-heading">
          <div>
            <span className="dashboard-eyebrow">POSISI INVENTARIS</span>
            <h2 id="status-heading">Statistik Status Barang</h2>
          </div>
          <span className="period-caption">
            {periodDays} hari <i>·</i> {selectedBranch.label}
          </span>
        </div>
        <div className="status-grid">
          {metrics.map((metric) => (
            <article
              className={`status-card status-${metric.color}`}
              key={metric.key}
            >
              <div className="status-card-top">
                <span className="status-dot" />
                <span className="status-card-label">{metric.label}</span>
                <span className="status-more">
                  <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </div>
              <strong className="status-count">
                {formatNumber(hasValidPeriod ? metric.count : 0)}
                <small> unit</small>
              </strong>
              <span className="status-note">{metric.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="sales-section"
        id="sales"
        aria-labelledby="sales-heading"
      >
        <div className="section-heading sales-heading">
          <div>
            <span className="dashboard-eyebrow">RINGKASAN PENJUALAN</span>
            <h2 id="sales-heading">Statistik Varian Terjual</h2>
          </div>
          <div className="chart-period">
            <CalendarDays aria-hidden="true" />
            <span>
              {formatShortDate(startDate)} — {formatShortDate(endDate)}
            </span>
          </div>
        </div>
        <p className="sales-description">
          Jumlah unit terjual per varian untuk{" "}
          <strong>{selectedBranch.label}</strong>.
        </p>
        <VariantSalesChart
          data={
            hasValidPeriod
              ? soldVariants
              : soldVariants.map((item) => ({ ...item, count: 0 }))
          }
        />
        <div className="chart-footnote">
          <span>DATA CONTOH</span>
          <span>Jumlah dalam unit</span>
        </div>
      </section>

      <section
        className="monthly-sales-section"
        id="monthly-sales"
        aria-labelledby="monthly-sales-heading"
      >
        <div className="section-heading sales-heading">
          <div>
            <span className="dashboard-eyebrow">TREN PENJUALAN</span>
            <h2 id="monthly-sales-heading">Statistik Penjualan Bulanan</h2>
          </div>
          <div className="monthly-total">
            <span>TOTAL PERIODE</span>
            <strong>
              {formatNumber(
                monthlySales.reduce((total, month) => total + month.total, 0),
              )}
              <small> unit</small>
            </strong>
          </div>
        </div>
        <p className="sales-description">
          Performa penjualan tiap bulan untuk{" "}
          <strong>{selectedBranch.label}</strong>. Bulan di luar tanggal
          terpilih tidak ditampilkan.
        </p>
        <MonthlySalesChart data={hasValidPeriod ? monthlySales : []} />
        <div className="chart-footnote">
          <span>DATA CONTOH</span>
          <span>Jumlah dalam unit</span>
        </div>
      </section>

      <DashboardFooter section="RINGKASAN OPERASIONAL" />
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
