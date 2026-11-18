"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DataTable } from "@/components/ui/data-table";
import { getApi, getApiError } from "@/lib/api";

type ActivityLog = {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isActivityLog(value: unknown): value is ActivityLog {
  if (!isRecord(value)) return false;
  return typeof value.id === "number" &&
    (typeof value.userId === "number" || value.userId === null) &&
    (typeof value.username === "string" || value.username === null) &&
    typeof value.action === "string" && typeof value.entityType === "string" &&
    (typeof value.entityId === "string" || value.entityId === null) &&
    (value.details === null || isRecord(value.details)) &&
    (typeof value.ipAddress === "string" || value.ipAddress === null) &&
    typeof value.createdAt === "string";
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("id-ID"));
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function detailsLabel(details: unknown) {
  if (!isRecord(details) || Object.keys(details).length === 0) return "—";
  return Object.entries(details)
    .map(([key, value]) => `${label(key)}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" · ");
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getApi("/activity-logs?limit=500")
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.activityLogs) || !data.activityLogs.every(isActivityLog)) {
          throw new Error("API mengembalikan daftar aktivitas yang tidak valid.");
        }
        setLogs(data.activityLogs);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setError(getApiError(cause));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return logs;
    return logs.filter((log) => [
      log.username ?? "", log.action, log.entityType, log.entityId ?? "",
      detailsLabel(log.details), log.ipAddress ?? "",
    ].join(" ").toLocaleLowerCase("id-ID").includes(query));
  }, [logs, search]);

  return (
    <div className="dashboard-content activity-content">
      <section className="dashboard-heading activity-heading" aria-labelledby="activity-title">
        <div>
          <div className="dashboard-eyebrow">AUDIT SISTEM</div>
          <h1 id="activity-title">Log Aktivitas</h1>
          <p>Riwayat perubahan dan akses terbaru di XL Perfumes.</p>
        </div>
        <div className="activity-count"><Activity aria-hidden="true" />{logs.length} aktivitas dimuat</div>
      </section>

      <section className="activity-table-section" aria-labelledby="activity-table-title">
        <header className="activity-table-header">
          <div>
            <span className="dashboard-eyebrow">CATATAN TERBARU</span>
            <h2 id="activity-table-title">Semua aktivitas <span>{filteredLogs.length}</span></h2>
            <p>Menampilkan hingga 500 catatan terbaru.</p>
          </div>
          <label className="activity-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari aktivitas</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pengguna atau aktivitas" />
          </label>
        </header>

        {error && <p className="activity-error" role="alert">Gagal memuat log aktivitas: {error}</p>}
        <DataTable<ActivityLog>
          ariaLabel="Daftar log aktivitas"
          className="activity-table"
          wrapperClassName="activity-table-wrap"
          stateCellClassName="activity-empty"
          columns={[
            { id: "time", header: "WAKTU (WIB)", className: "activity-time", renderCell: (log) => dateTimeLabel(log.createdAt) },
            { id: "actor", header: "PENGGUNA", renderCell: (log) => <strong className="activity-actor">{log.username || "Pengguna tidak diketahui"}</strong> },
            { id: "action", header: "AKTIVITAS", renderCell: (log) => <span className="activity-action">{label(log.action)}</span> },
            { id: "target", header: "OBJEK", renderCell: (log) => <span className="activity-target">{label(log.entityType)}{log.entityId ? ` #${log.entityId}` : ""}</span> },
            { id: "details", header: "DETAIL", className: "activity-details", renderCell: (log) => detailsLabel(log.details) },
            { id: "ip", header: "ALAMAT IP", className: "activity-ip", renderCell: (log) => log.ipAddress || "—" },
          ]}
          rows={filteredLogs}
          getRowKey={(log) => log.id}
          isLoading={isLoading}
          hasError={Boolean(error)}
          loadingContent="Memuat log aktivitas…"
          emptyContent={<><span className="activity-empty-icon"><Activity aria-hidden="true" /></span><strong>{logs.length ? "Aktivitas tidak ditemukan" : "Belum ada aktivitas"}</strong><span>{logs.length ? "Ubah kata kunci pencarian." : "Catatan aktivitas akan muncul di sini."}</span></>}
        />
        <footer className="activity-table-footer">
          <span>Menampilkan <strong>{filteredLogs.length}</strong> dari <strong>{logs.length}</strong> aktivitas</span>
          <span>Data terbaru diurutkan pertama</span>
        </footer>
      </section>
      <DashboardFooter />
    </div>
  );
}
