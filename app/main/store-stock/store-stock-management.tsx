"use client";

import { useEffect, useMemo, useState } from "react";
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
  id: number;
  name: string;
  branch: string;
  totalStock: number;
  lastUpdate: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStock(value: unknown): value is StockRow {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "branch" in value &&
    typeof value.branch === "string" &&
    "totalStock" in value &&
    typeof value.totalStock === "number" &&
    "lastUpdate" in value &&
    typeof value.lastUpdate === "string"
  );
}

function formatDate(value: string) {
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

  const branches = useMemo(
    () =>
      [...new Set(rows.map((row) => row.branch))].sort((a, b) =>
        a.localeCompare(b, "id-ID"),
      ),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return rows
      .filter((row) => {
        const updated = new Date(row.lastUpdate).getTime();
        const start = startDate
          ? new Date(`${startDate}T00:00:00`).getTime()
          : -Infinity;
        const end = endDate
          ? new Date(`${endDate}T23:59:59.999`).getTime()
          : Infinity;
        return (
          (!query || row.name.toLocaleLowerCase("id-ID").includes(query)) &&
          (branch === "all" || row.branch === branch) &&
          updated >= start &&
          updated <= end
        );
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
          : new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime(),
      );
  }, [rows, search, branch, startDate, endDate, sortOrder]);

  async function saveAdjustment() {
    if (!adjustment || quantity < 1) return;
    try {
      const response = await api.patch<{ stock: unknown }>(
        `/store-stock/${adjustment.row.id}`,
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
          <p>Pantau jumlah stok dan riwayat pembaruan di setiap toko.</p>
        </div>
        <span className="store-stock-total">
          <Package aria-hidden="true" /> {rows.length} TOKO
        </span>
      </section>

      <section
        className="store-stock-panel"
        aria-labelledby="store-stock-table-title"
      >
        <header className="store-stock-panel-header">
          <div>
            <span className="dashboard-eyebrow">DAFTAR INVENTARIS</span>
            <h2 id="store-stock-table-title">
              Stok per toko <span>{filteredRows.length}</span>
            </h2>
            <p>
              Gunakan filter untuk melihat pembaruan stok pada rentang waktu
              tertentu.
            </p>
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
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="store-stock-state" colSpan={5}>
                    Memuat daftar toko…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="store-stock-state" colSpan={5} role="alert">
                    Gagal memuat toko: {error}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="store-stock-state" colSpan={5}>
                    Tidak ada toko yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong className="store-stock-name">{row.name}</strong>
                    </td>
                    <td>
                      <span className="store-stock-branch">{row.branch}</span>
                    </td>
                    <td>
                      <span className="store-stock-quantity">
                        {row.totalStock.toLocaleString("id-ID")}{" "}
                        <small>unit</small>
                      </span>
                    </td>
                    <td className="store-stock-date-value">
                      {formatDate(row.lastUpdate)}
                    </td>
                    <td>
                      <div className="store-stock-actions">
                        <button
                          type="button"
                          className="stock-adjust-button stock-increase"
                          onClick={() => {
                            setAdjustment({ row, direction: "increase" });
                            setQuantity(1);
                          }}
                        >
                          <ArrowUp aria-hidden="true" /> Tambah
                        </button>
                        <button
                          type="button"
                          className="stock-adjust-button stock-decrease"
                          onClick={() => {
                            setAdjustment({ row, direction: "decrease" });
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
          Menampilkan <strong>{filteredRows.length}</strong> dari{" "}
          <strong>{rows.length}</strong> toko
        </footer>
      </section>

      {adjustment && (
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
        </div>
      )}
    </div>
  );
}
