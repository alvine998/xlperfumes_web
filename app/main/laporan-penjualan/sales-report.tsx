"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";
import { ApiPagination } from "@/components/ui/api-pagination";
import { isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";

const STATUS_OPTIONS = [
  ["pending", "Pending"], ["di_gudang", "Di Gudang"], ["di_toko", "Di Toko"],
  ["di_spg", "Di SPG"], ["di_collecting", "Di Collecting"], ["rusak", "Rusak"],
] as const;
type TargetStatus = (typeof STATUS_OPTIONS)[number][0];
type Product = { id: number; variantId: number | null; variantName: string | null; barcode: string; branch: string; status: "terjual"; updatedAt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.barcode === "string" && typeof value.branch === "string" &&
    value.status === "terjual" && typeof value.updatedAt === "string";
}

function isTargetStatus(value: string): value is TargetStatus {
  return STATUS_OPTIONS.some(([status]) => status === value);
}

export function SalesReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [targets, setTargets] = useState<Record<number, TargetStatus>>({});
  const requestKey = `${page}:${reload}`;
  const loading = loadedRequest !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    let active = true;
    getApi(`/products?status=terjual&page=${page}&limit=50`)
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.products) || !data.products.every(isProduct) || !isApiPagination(data.pagination)) {
          throw new Error("Data laporan penjualan dari API tidak valid.");
        }
        if (active) {
          setProducts(data.products);
          setPagination(data.pagination);
          setPage(Math.min(page, Math.max(1, data.pagination.totalPages)));
          setRequestError(null);
          setLoadedRequest(requestKey);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRequestError({ key: requestKey, message: getApiError(reason) });
          setLoadedRequest(requestKey);
        }
      });
    return () => { active = false; };
  }, [page, reload, requestKey]);

  async function updateStatus(product: Product) {
    const status = targets[product.id];
    if (!status || saving !== null) return;
    setSaving(product.id);
    try {
      await api.patch(`/products/${product.id}/sales-status`, { status });
      toast.success(`Status ${product.barcode} berhasil diubah.`);
      setTargets((current) => { const next = { ...current }; delete next[product.id]; return next; });
      setReload((value) => value + 1);
    } catch (reason) {
      toast.error(getApiError(reason));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="sales-report-content" aria-labelledby="sales-report-title">
      <div className="sales-report-heading">
        <div><span className="dashboard-eyebrow">LAPORAN</span><h1 id="sales-report-title">Laporan Penjualan</h1><p>Kelola status produk yang tercatat terjual.</p></div>
        <div className="sales-report-count"><strong>{new Intl.NumberFormat("id-ID").format(pagination.total)}</strong><span>produk terjual</span></div>
      </div>
      <div className="sales-report-panel">
        <div className="sales-report-panel-heading"><div><h2>Produk Terjual</h2><p>Perubahan status tersedia untuk admin dan owner.</p></div><button type="button" className="sales-report-refresh" onClick={() => setReload((value) => value + 1)} disabled={loading}><RotateCcw aria-hidden="true" /> Muat ulang</button></div>
        {error && <p className="sales-report-error" role="alert">Laporan gagal dimuat: {error}</p>}
        <div className="sales-report-table-wrap">
          <table className="sales-report-table">
            <thead><tr><th>No.</th><th>Varian</th><th>Barcode</th><th>Cabang</th><th>Status</th><th>Ubah Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="sales-report-state" role="status">Memuat laporan…</td></tr>
                : error ? <tr><td colSpan={7} className="sales-report-state">Data belum dapat ditampilkan.</td></tr>
                  : products.length === 0 ? <tr><td colSpan={7} className="sales-report-state">Belum ada produk terjual.</td></tr>
                    : products.map((product, index) => (
                      <tr key={product.id}>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td className="sales-report-name">{product.variantName ?? "Varian belum dipetakan"}</td>
                        <td className="sales-report-barcode">{product.barcode}</td>
                        <td>{product.branch}</td>
                        <td><span className="sales-report-status">Terjual</span></td>
                        <td><label className="sr-only" htmlFor={`sales-status-${product.id}`}>Status baru untuk {product.barcode}</label><select id={`sales-status-${product.id}`} value={targets[product.id] ?? ""} onChange={(event) => { const value = event.target.value; if (isTargetStatus(value)) setTargets((current) => ({ ...current, [product.id]: value })); }}><option value="" disabled>Pilih status</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                        <td><button type="button" className="sales-report-save" onClick={() => void updateStatus(product)} disabled={!targets[product.id] || saving !== null}>{saving === product.id ? "Menyimpan…" : <><Check aria-hidden="true" /> Simpan</>}</button></td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        <ApiPagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} itemLabel="produk" onPageChange={setPage} onLimitChange={() => undefined} pageSizes={[50]} isLoading={loading} />
      </div>
    </section>
  );
}
