"use client";

import { useEffect, useState } from "react";
import { Activity, Search } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DataTable } from "@/components/ui/data-table";
import { ApiPagination } from "@/components/ui/api-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getApi, getApiError } from "@/lib/api";
import { isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";

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

const PAGE_SIZES = [50, 100, 200, 500] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filterOptions, setFilterOptions] = useState({ users: [] as string[], branches: [] as string[], actions: [] as string[] });
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50);
  const [page, setPage] = useState(1);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    includeOptions: "true",
  });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (userFilter !== "all") params.set("username", userFilter);
  if (branchFilter !== "all") params.set("branch", branchFilter);
  if (actionFilter !== "all") params.set("action", actionFilter);
  const requestQuery = params.toString();
  const requestKey = requestQuery;
  const isLoading = loadedRequestKey !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    let isCurrent = true;
    getApi(`/activity-logs?${requestQuery}`)
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.activityLogs) || !data.activityLogs.every(isActivityLog) ||
          !isApiPagination(data.pagination)) {
          throw new Error("API mengembalikan daftar aktivitas yang tidak valid.");
        }
        setLogs(data.activityLogs);
        setPagination(data.pagination);
        setPage(Math.min(page, Math.max(1, data.pagination.totalPages)));
        setRequestError(null);
        if (isRecord(data.filters) && isStringArray(data.filters.users) &&
          isStringArray(data.filters.branches) && isStringArray(data.filters.actions)) {
          setFilterOptions({ users: data.filters.users, branches: data.filters.branches, actions: data.filters.actions });
          if (data.filters.branches.length === 1 && data.filters.branches[0]) {
            setBranchFilter(data.filters.branches[0]);
          }
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) setRequestError({ key: requestKey, message: getApiError(cause) });
      })
      .finally(() => {
        if (isCurrent) setLoadedRequestKey(requestKey);
      });
    return () => { isCurrent = false; };
  }, [requestQuery, requestKey, page]);

  function clearFilters() {
    setPage(1);
    setSearch("");
    setStartDate("");
    setEndDate("");
    setUserFilter("all");
    setBranchFilter(filterOptions.branches.length === 1 ? filterOptions.branches[0] ?? "all" : "all");
    setActionFilter("all");
  }

  return (
    <div className="dashboard-content activity-content">
      <section className="dashboard-heading activity-heading" aria-labelledby="activity-title">
        <div>
          <div className="dashboard-eyebrow">AUDIT SISTEM</div>
          <h1 id="activity-title">Log Aktivitas</h1>
          <p>Riwayat perubahan dan akses terbaru di XL Perfumes.</p>
        </div>
        <div className="activity-count"><Activity aria-hidden="true" />{pagination.total} aktivitas</div>
      </section>

      <section className="activity-table-section" aria-labelledby="activity-table-title">
        <header className="activity-table-header">
          <div>
            <span className="dashboard-eyebrow">CATATAN TERBARU</span>
            <h2 id="activity-table-title">Semua aktivitas <span>{pagination.total}</span></h2>
            <p>Filter, pencarian, dan halaman diproses oleh API.</p>
          </div>
        </header>

        <div className="activity-filters" aria-label="Filter aktivitas">
          <label className="activity-filter-field">
            <span>Tanggal mulai</span>
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => { setPage(1); setStartDate(event.target.value); }} />
          </label>
          <label className="activity-filter-field">
            <span>Tanggal akhir</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setPage(1); setEndDate(event.target.value); }} />
          </label>
          <label className="activity-filter-field">
            <span>Pengguna</span>
            <select value={userFilter} onChange={(event) => { setPage(1); setUserFilter(event.target.value); }}>
              <option value="all">Semua pengguna</option>
              {filterOptions.users.map((username) => <option key={username} value={username}>{username}</option>)}
            </select>
          </label>
          <label className="activity-filter-field">
            <span>Cabang</span>
            <select value={branchFilter} onChange={(event) => { setPage(1); setBranchFilter(event.target.value); }}>
              {filterOptions.branches.length !== 1 && <option value="all">Semua cabang</option>}
              {filterOptions.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
            </select>
          </label>
          <label className="activity-filter-field">
            <span>Aksi</span>
            <select value={actionFilter} onChange={(event) => { setPage(1); setActionFilter(event.target.value); }}>
              <option value="all">Semua aksi</option>
              {filterOptions.actions.map((action) => <option key={action} value={action}>{label(action)}</option>)}
            </select>
          </label>
          <label className="activity-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari aktivitas</span>
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Cari aktivitas" />
          </label>
          <button className="activity-clear-filters" type="button" onClick={clearFilters}>Atur ulang</button>
        </div>

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
          rows={logs}
          getRowKey={(log) => log.id}
          isLoading={isLoading}
          hasError={Boolean(error)}
          loadingContent="Memuat log aktivitas…"
          emptyContent={<><span className="activity-empty-icon"><Activity aria-hidden="true" /></span><strong>{pagination.total ? "Aktivitas tidak ditemukan" : "Belum ada aktivitas"}</strong><span>{pagination.total ? "Ubah kata kunci pencarian." : "Catatan aktivitas akan muncul di sini."}</span></>}
        />
        <ApiPagination
          page={pagination.page}
          limit={pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="aktivitas"
          pageSizes={PAGE_SIZES}
          isLoading={isLoading}
          onPageChange={setPage}
          onLimitChange={(limit) => {
            const nextPageSize = PAGE_SIZES.find((size) => size === limit);
            if (nextPageSize) { setPage(1); setPageSize(nextPageSize); }
          }}
        />
      </section>
      <DashboardFooter section="LOG AKTIVITAS" />
    </div>
  );
}
