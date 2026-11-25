"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Package, PackagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";
import { StoreVisitReceiveModal } from "./store-visit-receive-modal";
import { StoreStockAdjustmentModal } from "./store-stock-adjustment-modal";
import { isVisitStock, type VisitStock } from "./store-visit-stock-types";

type VisitProduct = {
  id: number;
  barcode: string;
  storeId: number | null;
  variantId: number | null;
  variantName: string | null;
  status: string;
};
type StatusTarget = "di_collecting" | "terjual" | "rusak";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVisitProduct(value: unknown): value is VisitProduct {
  return isRecord(value) && typeof value.id === "number" &&
    typeof value.barcode === "string" &&
    (typeof value.storeId === "number" || value.storeId === null) &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.status === "string";
}

function isVisitStockResponse(value: unknown): value is {
  stocks: VisitStock[];
  products: VisitProduct[];
  canManageProducts: boolean;
} {
  return isRecord(value) && Array.isArray(value.stocks) && value.stocks.every(isVisitStock) &&
    Array.isArray(value.products) && value.products.every(isVisitProduct) &&
    typeof value.canManageProducts === "boolean";
}

function isStatusTarget(value: string): value is StatusTarget {
  return Object.hasOwn(STATUS_LABELS, value);
}

const STATUS_LABELS: Record<StatusTarget, string> = {
  di_collecting: "Di Collecting",
  terjual: "Terjual",
  rusak: "Rusak",
};

export function StoreVisitStock({ storeId }: { storeId: number }) {
  const [stocks, setStocks] = useState<VisitStock[]>([]);
  const [products, setProducts] = useState<VisitProduct[]>([]);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [statusBarcode, setStatusBarcode] = useState("");
  const [statusTarget, setStatusTarget] = useState<StatusTarget>("terjual");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusTargets, setStatusTargets] = useState<Record<number, StatusTarget>>({});
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getApi(`/store-stock/${storeId}/visit`)
      .then(({ data }) => {
        if (!isVisitStockResponse(data)) throw new Error("Data stok toko tidak valid.");
        if (!active) return;
        setStocks(data.stocks);
        setProducts(data.products);
        setCanManageProducts(data.canManageProducts);
        setLoadError("");
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(getApiError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [storeId, reloadKey]);

  function refresh() {
    setLoading(true);
    setLoadError("");
    setReloadKey((current) => current + 1);
  }

  async function updateProductStatus(product: VisitProduct) {
    const status = statusTargets[product.id] ?? "terjual";
    setUpdatingProductId(product.id);
    try {
      const { data } = await api.patch<unknown>(
        `/store-stock/${storeId}/visit/status`,
        { barcode: product.barcode, status },
      );
      if (!isRecord(data) || !isVisitProduct(data.product)) {
        throw new Error("Data perubahan status produk tidak valid.");
      }
      toast.success(`Status produk berhasil diubah menjadi ${STATUS_LABELS[status]}.`);
      refresh();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function updateStatusByBarcode() {
    const code = statusBarcode.trim();
    if (!code || statusSubmitting) return;
    setStatusSubmitting(true);
    try {
      const { data } = await api.patch<unknown>(`/store-stock/${storeId}/visit/status`, {
        barcode: code,
        status: statusTarget,
      });
      if (!isRecord(data) || !isVisitProduct(data.product)) {
        throw new Error("Data perubahan status produk tidak valid.");
      }
      toast.success(`Status ${code} berhasil diubah menjadi ${STATUS_LABELS[statusTarget]}.`);
      setStatusBarcode("");
      refresh();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setStatusSubmitting(false);
    }
  }

  const totalStock = stocks.reduce((sum, row) => sum + row.totalStock, 0);

  return (
    <section className="store-visit-panel store-visit-stock-panel" aria-labelledby="visit-stock-title">
      <header className="store-visit-stock-heading">
        <div className="store-visit-panel-heading">
          <span className="store-visit-icon visit-stock-icon"><Package aria-hidden="true" /></span>
          <div>
            <span className="dashboard-eyebrow">INVENTARIS TOKO</span>
            <h2 id="visit-stock-title">Stok Toko</h2>
            <p>Jumlah persediaan dan produk yang tercatat di toko ini.</p>
          </div>
        </div>
        <div className="store-visit-stock-heading-actions">
          <span className="store-visit-stock-total"><Package aria-hidden="true" /> {totalStock.toLocaleString("id-ID")} PCS</span>
          {canManageProducts && <>
            <button className="store-visit-stock-open-button receive" type="button" onClick={() => setReceiveModalOpen(true)}>
              <PackagePlus aria-hidden="true" /> Masukkan Barang ke Toko
            </button>
            <button className="store-visit-stock-open-button adjust" type="button" onClick={() => setStockModalOpen(true)}>
              <ArrowUp aria-hidden="true" /> Update Stok Toko
            </button>
          </>}
        </div>
      </header>

      {loading ? <p className="store-visit-stock-state" role="status">Memuat stok toko…</p>
        : loadError ? <p className="store-visit-stock-state is-error" role="alert">Gagal memuat stok toko: {loadError}</p>
          : <>
            <div className="store-visit-stock-section">
              <h3>Ringkasan per Varian</h3>
              <div className="store-visit-stock-table-wrap">
                <table className="store-visit-stock-table">
                  <thead><tr><th>Varian Parfum</th><th>Stok</th><th>Isi Varian</th></tr></thead>
                  <tbody>
                    {stocks.length === 0 ? <tr><td className="store-visit-stock-state" colSpan={3}>Belum ada data varian untuk toko ini.</td></tr>
                      : stocks.map((row) => <tr key={row.id}>
                        <td><strong>{row.variantName}</strong></td>
                        <td><span className="store-visit-stock-quantity">{row.totalStock.toLocaleString("id-ID")} pcs</span></td>
                        <td>{row.variantQuantity.toLocaleString("id-ID")} {row.variantUnit}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="store-visit-stock-section">
              <div className="store-visit-stock-subheading">
                <div><h3>Produk Berbarcode di Toko <span>{products.length}</span></h3><p>Produk yang masuk melalui proses kunjungan atau penerimaan stok.</p></div>
              </div>
              {canManageProducts && <form className="store-visit-stock-status-form" onSubmit={(event) => { event.preventDefault(); void updateStatusByBarcode(); }}>
                <label htmlFor={`visit-stock-status-barcode-${storeId}`}>Ubah status dengan QR produk</label>
                <div>
                  <input id={`visit-stock-status-barcode-${storeId}`} autoComplete="off" value={statusBarcode} onChange={(event) => setStatusBarcode(event.target.value)} placeholder="Scan atau ketik kode QR yang ada di toko" />
                  <select aria-label="Status tujuan" value={statusTarget} onChange={(event) => {
                    if (isStatusTarget(event.target.value)) setStatusTarget(event.target.value);
                  }}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button type="submit" disabled={!statusBarcode.trim() || statusSubmitting}>{statusSubmitting ? "Menyimpan…" : "Ubah Status"}</button>
                </div>
                <small>Pemindaian ini juga dapat mengubah status produk lama yang belum tertaut ke barcode toko.</small>
              </form>}
              <div className="store-visit-stock-table-wrap">
                <table className="store-visit-stock-table visit-products-table">
                  <thead><tr><th>Varian Parfum</th><th>Kode QR</th><th>Status</th>{canManageProducts && <th>Ubah Status</th>}</tr></thead>
                  <tbody>
                    {products.length === 0 ? <tr><td className="store-visit-stock-state" colSpan={canManageProducts ? 4 : 3}>{totalStock > 0 ? "Jumlah stok tersedia, tetapi belum ada barcode produk yang tercatat untuk toko ini." : "Belum ada produk berbarcode di toko ini."}</td></tr>
                      : products.map((product) => <tr key={product.id}>
                        <td><strong>{product.variantName ?? "Varian belum dipetakan"}</strong></td>
                        <td><code>{product.barcode}</code></td>
                        <td><span className="store-visit-product-status">Di Toko</span></td>
                        {canManageProducts && <td><div className="store-visit-product-action">
                          <label><span className="sr-only">Status baru untuk {product.barcode}</span><select value={statusTargets[product.id] ?? "terjual"} onChange={(event) => {
                            const nextStatus = event.target.value;
                            if (isStatusTarget(nextStatus)) {
                              setStatusTargets((current) => ({ ...current, [product.id]: nextStatus }));
                            }
                          }}>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select></label>
                          <button type="button" onClick={() => void updateProductStatus(product)} disabled={updatingProductId === product.id}>{updatingProductId === product.id ? "Menyimpan…" : "Simpan"}</button>
                        </div></td>}
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
      {canManageProducts && receiveModalOpen && <StoreVisitReceiveModal
        storeId={storeId}
        onClose={() => setReceiveModalOpen(false)}
        onReceived={() => {
          setReceiveModalOpen(false);
          refresh();
        }}
      />}
      {canManageProducts && stockModalOpen && <StoreStockAdjustmentModal
        storeId={storeId}
        stocks={stocks}
        onClose={() => setStockModalOpen(false)}
        onUpdated={() => {
          setStockModalOpen(false);
          refresh();
        }}
      />}
    </section>
  );
}
