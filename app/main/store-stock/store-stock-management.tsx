"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { api, getApi, getApiError } from "@/lib/api";

type StockRow = {
  id: string;
  storeId: number;
  name: string;
  branch: string;
  variantId: number;
  variantName: string;
  variantQuantity: number;
  variantUnit: string;
  totalStock: number;
  lastUpdate: string | null;
  updatedBy: { id: number; username: string } | null;
};
type StoreSummary = {
  storeId: number;
  name: string;
  branch: string;
  totalStock: number;
  lastUpdate: string | null;
  updatedBy: StockRow["updatedBy"];
  items: StockRow[];
};
type Pagination = { page: number; limit: number; total: number; totalPages: number };

const PAGE_SIZES = [10, 25, 50] as const;
const INITIAL_PAGINATION: Pagination = {
  page: 1,
  limit: PAGE_SIZES[0],
  total: 0,
  totalPages: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStock(value: unknown): value is StockRow {
  if (!isRecord(value)) return false;
  const updatedBy = value.updatedBy;
  return (
    typeof value.id === "string" &&
    typeof value.storeId === "number" &&
    typeof value.name === "string" &&
    typeof value.branch === "string" &&
    typeof value.variantId === "number" &&
    typeof value.variantName === "string" &&
    typeof value.variantQuantity === "number" &&
    typeof value.variantUnit === "string" &&
    typeof value.totalStock === "number" &&
    (value.lastUpdate === null || typeof value.lastUpdate === "string") &&
    (updatedBy === null ||
      (isRecord(updatedBy) &&
        typeof updatedBy.id === "number" &&
        typeof updatedBy.username === "string"))
  );
}

function isPagination(value: unknown): value is Pagination {
  return (
    isRecord(value) &&
    typeof value.page === "number" &&
    typeof value.limit === "number" &&
    typeof value.total === "number" &&
    typeof value.totalPages === "number" &&
    Number.isInteger(value.page) &&
    Number.isInteger(value.limit) &&
    Number.isInteger(value.total) &&
    Number.isInteger(value.totalPages) &&
    value.page >= 1 &&
    value.limit >= 1 &&
    value.total >= 0 &&
    value.totalPages >= 0
  );
}

function formatDate(value: string | null) {
  if (!value) return "Belum diperbarui";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StoreStockManagement() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [branches, setBranches] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [adjustment, setAdjustment] = useState<{
    row: StockRow;
    direction: "increase" | "decrease";
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), sortOrder });
  const query = debouncedSearch.trim();
  if (query) params.set("search", query);
  if (branch !== "all") params.set("branch", branch);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const requestQuery = params.toString();
  const requestKey = `${requestQuery}|reload=${reloadKey}`;
  const loading = loadedRequestKey !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    let current = true;
    getApi(`/store-stock?${requestQuery}`)
      .then(({ data }) => {
        if (
          !isRecord(data) ||
          !Array.isArray(data.stocks) ||
          !data.stocks.every(isStock) ||
          !isPagination(data.pagination) ||
          !Array.isArray(data.branches) ||
          !data.branches.every(isString)
        ) {
          throw new Error("Data stok dari API tidak valid.");
        }
        if (current) {
          setRows(data.stocks);
          setBranches(data.branches);
          setPagination(data.pagination);
          setPage(data.pagination.page);
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (current) setRequestError({ key: requestKey, message: getApiError(cause) });
      })
      .finally(() => {
        if (current) setLoadedRequestKey(requestKey);
      });
    return () => {
      current = false;
    };
  }, [requestQuery, requestKey]);

  const stores = useMemo(() => {
    const grouped = new Map<number, StoreSummary>();
    for (const row of rows) {
      const store = grouped.get(row.storeId) ?? {
        storeId: row.storeId,
        name: row.name,
        branch: row.branch,
        totalStock: 0,
        lastUpdate: null,
        updatedBy: null,
        items: [],
      };
      store.totalStock += row.totalStock;
      store.items.push(row);
      if (
        row.lastUpdate &&
        (!store.lastUpdate ||
          new Date(row.lastUpdate) > new Date(store.lastUpdate))
      ) {
        store.lastUpdate = row.lastUpdate;
        store.updatedBy = row.updatedBy;
      }
      grouped.set(row.storeId, store);
    }
    return [...grouped.values()];
  }, [rows]);
  const pageCount = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, pageCount);
  const rangeStart = pagination.total ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * pageSize, pagination.total);

  async function saveAdjustment() {
    if (!adjustment || quantity < 1) return;
    try {
      const response = await api.patch<{ stock: unknown }>(
        `/store-stock/${adjustment.row.storeId}/${adjustment.row.variantId}`,
        {
          direction: adjustment.direction,
          quantity,
        },
      );
      if (!isRecord(response.data) || !isStock(response.data.stock)) {
        throw new Error("Data stok hasil penyesuaian tidak valid.");
      }
      const updatedStock = response.data.stock;
      setRows((current) =>
        current.map((row) => (row.id === updatedStock.id ? updatedStock : row)),
      );
      setReloadKey((current) => current + 1);
      setAdjustment(null);
      setQuantity(1);
      toast.success("Stok toko berhasil diperbarui.");
    } catch (cause) {
      toast.error(getApiError(cause));
    }
  }

  return (
    <div className="dashboard-content store-stock-content">
      <section
        className="dashboard-heading store-stock-heading"
        aria-labelledby="store-stock-title"
      >
        <div>
          <span className="dashboard-eyebrow">INVENTARIS TOKO</span>
          <h1 id="store-stock-title">Stok Toko</h1>
          <p>Pantau total persediaan yang tersedia di setiap toko.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="store-stock-total">
            <Package aria-hidden="true" /> {pagination.total} TOKO
          </span>
          <Link className="store-stock-add-link" href="/main/store-stock/add">
            <Plus aria-hidden="true" /> Tambah Stok
          </Link>
        </div>
      </section>

      <section
        className="store-stock-panel"
        aria-labelledby="store-stock-table-title"
      >
        <header className="store-stock-panel-header">
          <div>
            <span className="dashboard-eyebrow">DAFTAR INVENTARIS</span>
            <h2 id="store-stock-table-title">
              Total stok per toko <span>{pagination.total}</span>
            </h2>
            <p>Total seluruh stok yang tersedia di setiap toko.</p>
          </div>
          <div className="store-stock-filters">
            <label className="store-stock-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Cari nama toko</span>
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Cari nama toko…"
              />
            </label>
            <label className="store-stock-date">
              <span className="store-stock-date-label">Mulai</span>
              <CalendarDays aria-hidden="true" />
              <span className="sr-only">Tanggal mulai</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setPage(1);
                  setStartDate(event.target.value);
                }}
              />
            </label>
            <label className="store-stock-date">
              <span className="store-stock-date-label">Akhir</span>
              <CalendarDays aria-hidden="true" />
              <span className="sr-only">Tanggal akhir</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setPage(1);
                  setEndDate(event.target.value);
                }}
              />
            </label>
            <label className="store-stock-select">
              <span className="sr-only">Filter cabang</span>
              <select
                value={branch}
                onChange={(event) => {
                  setPage(1);
                  setBranch(event.target.value);
                }}
              >
                <option value="all">Semua Cabang</option>
                {branches.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
            <label className="store-stock-select">
              <span className="sr-only">Urutkan tanggal</span>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setPage(1);
                  setSortOrder(
                    event.target.value === "oldest" ? "oldest" : "newest",
                  );
                }}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
          </div>
        </header>

        <div className="store-stock-table-wrap">
          <table className="store-stock-table">
            <thead>
              <tr>
                <th>Nama Toko</th>
                <th>Cabang</th>
                <th>Total Stok</th>
                <th>Last Update</th>
                <th>Diperbarui oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="store-stock-state" colSpan={6}>
                    Memuat daftar toko…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="store-stock-state" colSpan={6} role="alert">
                    Gagal memuat toko: {error}
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td className="store-stock-state" colSpan={6}>
                    Tidak ada toko yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.storeId}>
                    <td>
                      <strong className="store-stock-name">{store.name}</strong>
                    </td>
                    <td>
                      <span className="store-stock-branch">{store.branch}</span>
                    </td>
                    <td>
                      <span className="store-stock-quantity">
                        {store.totalStock.toLocaleString("id-ID")}{" "}
                        <small>pcs</small>
                      </span>
                    </td>
                    <td className="store-stock-date-value">
                      {formatDate(store.lastUpdate)}
                    </td>
                    <td className="store-stock-date-value">
                      {store.updatedBy?.username ?? "—"}
                    </td>
                    <td>
                      <div className="store-stock-actions">
                        <Link
                          className="stock-adjust-button stock-increase"
                          href={`/main/store-stock/add?storeId=${store.storeId}`}
                        >
                          <ArrowUp aria-hidden="true" /> Tambah
                        </Link>
                        <button
                          type="button"
                          className="stock-adjust-button stock-decrease"
                          disabled={store.items.every(
                            (item) => item.totalStock === 0,
                          )}
                          onClick={() => {
                            const firstAvailable =
                              store.items.find((item) => item.totalStock > 0) ??
                              store.items[0];
                            setAdjustment({
                              row: firstAvailable,
                              direction: "decrease",
                            });
                            setQuantity(1);
                          }}
                        >
                          <ArrowDown aria-hidden="true" /> Kurangi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="store-stock-footer">
          <span className="store-stock-page-summary">
            Menampilkan <strong>{rangeStart}–{rangeEnd}</strong> dari{" "}
            <strong>{pagination.total}</strong> toko
          </span>
          <div className="store-stock-pagination">
            <label className="store-stock-page-size">
              Baris per halaman
              <select
                aria-label="Baris per halaman"
                value={pageSize}
                onChange={(event) => {
                  const nextPageSize = PAGE_SIZES.find(
                    (size) => size === Number(event.target.value),
                  );
                  if (nextPageSize) setPageSize(nextPageSize);
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <nav
              className="store-stock-page-nav"
              aria-label="Navigasi halaman stok toko"
            >
              <span>Halaman {currentPage} dari {pageCount}</span>
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1 || loading}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Halaman berikutnya"
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                disabled={currentPage >= pageCount || loading}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          </div>
        </footer>
      </section>

      {adjustment &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="store-stock-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAdjustment(null);
            }}
          >
            <section
              className="store-stock-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="stock-adjust-title"
            >
              <span
                className={`store-stock-modal-icon ${adjustment.direction}`}
                aria-hidden="true"
              >
                {adjustment.direction === "increase" ? <Plus /> : <Minus />}
              </span>
              <h2 id="stock-adjust-title">
                {adjustment.direction === "increase"
                  ? "Tambah stok"
                  : "Kurangi stok"}
              </h2>
              <p>
                {adjustment.row.name} · {adjustment.row.branch}
              </p>
              {adjustment.direction === "decrease" && (
                <label className="store-stock-modal-variant">
                  Varian untuk dikurangi
                  <select
                    value={adjustment.row.variantId}
                    onChange={(event) => {
                      const nextRow = rows.find(
                        (row) =>
                          row.storeId === adjustment.row.storeId &&
                          row.variantId === Number(event.target.value),
                      );
                      if (nextRow) {
                        setAdjustment({ ...adjustment, row: nextRow });
                        setQuantity(1);
                      }
                    }}
                  >
                    {rows
                      .filter((row) => row.storeId === adjustment.row.storeId)
                      .map((row) => (
                        <option
                          key={row.variantId}
                          value={row.variantId}
                          disabled={row.totalStock === 0}
                        >
                          {row.variantName} —{" "}
                          {row.totalStock.toLocaleString("id-ID")} pcs
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                Jumlah unit
                <input
                  type="number"
                  min="1"
                  max={
                    adjustment.direction === "decrease"
                      ? adjustment.row.totalStock
                      : undefined
                  }
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
              {adjustment.direction === "decrease" && (
                <small>Stok saat ini: {adjustment.row.totalStock} unit</small>
              )}
              <div className="store-stock-modal-actions">
                <button
                  type="button"
                  className="stock-cancel-button"
                  onClick={() => setAdjustment(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="stock-confirm-button"
                  disabled={
                    adjustment.direction === "decrease" &&
                    quantity > adjustment.row.totalStock
                  }
                  onClick={saveAdjustment}
                >
                  Simpan perubahan
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
