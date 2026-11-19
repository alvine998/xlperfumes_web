"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Package, Save } from "lucide-react";
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
};
type StoreOption = { id: number; name: string; branch: string };
type AddItem = { variantId: number; quantity: number; notes: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStock(value: unknown): value is StockRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.storeId === "number" &&
    typeof value.name === "string" &&
    typeof value.branch === "string" &&
    typeof value.variantId === "number" &&
    typeof value.variantName === "string" &&
    typeof value.variantQuantity === "number" &&
    typeof value.variantUnit === "string" &&
    typeof value.totalStock === "number"
  );
}

function formatNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

export function AddStoreStock() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [storeId, setStoreId] = useState(() => {
    const initialStoreId = searchParams.get("storeId") ?? "";
    return /^\d+$/.test(initialStoreId) ? initialStoreId : "";
  });
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    const storeMap = new Map<number, StoreOption>();
    for (const row of rows)
      storeMap.set(row.storeId, {
        id: row.storeId,
        name: row.name,
        branch: row.branch,
      });
    return [...storeMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "id-ID"),
    );
  }, [rows]);
  const selectedRows = useMemo(
    () => rows.filter((row) => String(row.storeId) === storeId),
    [rows, storeId],
  );

  function updateQuantity(variantId: number, value: string) {
    setQuantities((current) => ({
      ...current,
      [variantId]: formatNumber(value),
    }));
  }

  async function submit() {
    const items: AddItem[] = selectedRows.flatMap((row) => {
      const quantity = Number(
        (quantities[row.variantId] ?? "").replace(/\D/g, ""),
      );
      return quantity > 0
        ? [
            {
              variantId: row.variantId,
              quantity,
              notes:
                (notes[row.variantId] ?? "Dari Gudang").trim() || "Dari Gudang",
            },
          ]
        : [];
    });
    if (!storeId) return toast.error("Pilih toko terlebih dahulu.");
    if (!items.length)
      return toast.error("Isi jumlah pcs minimal pada satu varian.");
    setSaving(true);
    try {
      await api.post(`/store-stock/${storeId}/receive`, { items });
      toast.success("Tambahan stok dari gudang berhasil disimpan.");
      router.push("/main/store-stock");
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-content store-stock-content">
      <section
        className="dashboard-heading store-stock-heading"
        aria-labelledby="add-stock-title"
      >
        <div>
          <span className="dashboard-eyebrow">INVENTARIS TOKO</span>
          <h1 id="add-stock-title">Tambah Stok</h1>
          <p>Pilih jumlah produk yang dipindahkan dari gudang ke toko.</p>
        </div>
        <Link className="store-stock-back-link" href="/main/store-stock">
          <ArrowLeft aria-hidden="true" /> Kembali
        </Link>
      </section>

      <section
        className="store-stock-panel add-store-stock-panel"
        aria-labelledby="add-stock-table-title"
      >
        <header className="store-stock-panel-header add-stock-header">
          <div>
            <span className="dashboard-eyebrow">FORM PENAMBAHAN</span>
            <h2 id="add-stock-table-title">
              Daftar varian <span>{selectedRows.length}</span>
            </h2>
            <p>Produk yang dipindahkan harus tersedia di gudang.</p>
          </div>
          <label className="add-stock-store-select">
            <span>Toko tujuan</span>
            <span className="add-stock-select-control">
              <Package aria-hidden="true" />
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                disabled={loading || !!error}
              >
                <option value="">Pilih toko</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} · {store.branch}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>
        </header>

        <div className="store-stock-table-wrap">
          <table className="store-stock-table add-store-stock-table">
            <thead>
              <tr>
                <th>Varian Parfum</th>
                <th>Stok Saat Ini</th>
                <th>Tambah (pcs)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="store-stock-state" colSpan={4}>
                    Memuat daftar varian…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="store-stock-state" colSpan={4} role="alert">
                    Gagal memuat stok: {error}
                  </td>
                </tr>
              ) : !storeId ? (
                <tr>
                  <td className="store-stock-state" colSpan={4}>
                    Pilih toko tujuan untuk melihat daftar stoknya.
                  </td>
                </tr>
              ) : selectedRows.length === 0 ? (
                <tr>
                  <td className="store-stock-state" colSpan={4}>
                    Belum ada varian untuk toko ini.
                  </td>
                </tr>
              ) : (
                selectedRows.map((row) => (
                  <tr key={row.variantId}>
                    <td>
                      <strong className="store-stock-name">
                        {row.variantName}
                      </strong>
                      {/* <small className="store-stock-variant-detail">
                        {row.variantQuantity} {row.variantUnit}
                      </small> */}
                    </td>
                    <td>
                      <span className="store-stock-quantity">
                        {row.totalStock.toLocaleString("id-ID")}{" "}
                        <small>pcs</small>
                      </span>
                    </td>
                    <td>
                      <label className="add-stock-cell-field">
                        <span className="sr-only">
                          Jumlah pcs untuk {row.variantName}
                        </span>
                        <input
                          inputMode="numeric"
                          value={quantities[row.variantId] ?? ""}
                          onChange={(event) =>
                            updateQuantity(row.variantId, event.target.value)
                          }
                          placeholder="0"
                        />
                      </label>
                    </td>
                    <td>
                      <label className="add-stock-cell-field">
                        <span className="sr-only">
                          Keterangan untuk {row.variantName}
                        </span>
                        <input
                          value={notes[row.variantId] ?? "Dari Gudang"}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [row.variantId]: event.target.value,
                            }))
                          }
                          maxLength={500}
                        />
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="add-stock-footer">
          <span>
            Stok hanya bertambah jika jumlah produk berstatus{" "}
            <strong>Di Gudang</strong> mencukupi.
          </span>
          <button
            className="store-stock-add-link"
            type="button"
            onClick={() => void submit()}
            disabled={saving || loading || !!error || !storeId}
          >
            <Save aria-hidden="true" />{" "}
            {saving ? "Menyimpan…" : "Simpan Tambahan Stok"}
          </button>
        </footer>
      </section>
    </div>
  );
}
