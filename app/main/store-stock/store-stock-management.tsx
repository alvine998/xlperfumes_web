"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Minus,
  Package,
  Plus,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adjustment, setAdjustment] = useState<{
    row: StockRow;
    direction: "increase" | "decrease";
  } | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let current = true;
    getApi("/store-stock")
      .then(({ data }) => {
        if (
          !isRecord(data) ||
          !Array.isArray(data.stocks) ||
          !data.stocks.every(isStock)
        ) {
          throw new Error("Data stok dari API tidak valid.");
        }
        if (current) setRows(data.stocks);
      })
      .catch((cause: unknown) => {
        if (current) setError(getApiError(cause));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

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
  const branches = useMemo(
    () =>
      [...new Set(stores.map((store) => store.branch))].sort((a, b) =>
        a.localeCompare(b, "id-ID"),
      ),
    [stores],
  );
  const filteredStores = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return stores
      .filter((store) => {
        const updated = store.lastUpdate
          ? new Date(store.lastUpdate).getTime()
          : null;
        const start = startDate
          ? new Date(`${startDate}T00:00:00`).getTime()
          : -Infinity;
        const end = endDate
          ? new Date(`${endDate}T23:59:59.999`).getTime()
          : Infinity;
        return (
          (!query || store.name.toLocaleLowerCase("id-ID").includes(query)) &&
          (branch === "all" || store.branch === branch) &&
          ((start === -Infinity && end === Infinity) ||
            (updated !== null && updated >= start && updated <= end))
        );
      })
      .sort((a, b) => {
        if (!a.lastUpdate) return b.lastUpdate ? 1 : 0;
        if (!b.lastUpdate) return -1;
        const delta =
          new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
        return sortOrder === "newest" ? -delta : delta;
      });
  }, [stores, search, branch, startDate, endDate, sortOrder]);

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
            <Package aria-hidden="true" /> {stores.length} TOKO
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
              Total stok per toko <span>{filteredStores.length}</span>
            </h2>
            <p>Total seluruh stok yang tersedia di setiap toko.</p>
          </div>
          <div className="store-stock-filters">
            <label className="store-stock-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Cari nama toko</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="store-stock-date">
              <span className="store-stock-date-label">Akhir</span>
              <CalendarDays aria-hidden="true" />
              <span className="sr-only">Tanggal akhir</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label className="store-stock-select">
              <span className="sr-only">Filter cabang</span>
              <select
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
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
                onChange={(event) =>
                  setSortOrder(
                    event.target.value === "oldest" ? "oldest" : "newest",
                  )
                }
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
              ) : filteredStores.length === 0 ? (
                <tr>
                  <td className="store-stock-state" colSpan={6}>
                    Tidak ada toko yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
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
          Menampilkan <strong>{filteredStores.length}</strong> dari{" "}
          <strong>{stores.length}</strong> toko
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
