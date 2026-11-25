"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Eye, Package, PackagePlus, RotateCcw, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";
import { ApiPagination } from "@/components/ui/api-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getAllApiPages, isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";

const STATUS_OPTIONS = [
  ["pending", "Pending"], ["di_gudang", "Di Gudang"], ["di_toko", "Di Toko"],
  ["di_spg", "Di SPG"], ["di_collecting", "Di Collecting"], ["terjual", "Terjual"], ["rusak", "Rusak"],
] as const;
type ProductStatus = (typeof STATUS_OPTIONS)[number][0];
type Product = { id: number; variantId: number | null; variantName: string | null; barcode: string; branchId: number; branch: string; status: ProductStatus; createdAt: string; updatedAt: string };
type Branch = { id: number; name: string };
type ProductActivity = { id: number; username: string | null; action: string; createdAt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.barcode === "string" && typeof value.branchId === "number" &&
    typeof value.branch === "string" && STATUS_OPTIONS.some(([status]) => status === value.status) &&
    typeof value.createdAt === "string" && typeof value.updatedAt === "string";
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function isProductActivity(value: unknown): value is ProductActivity {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.username === "string" || value.username === null) &&
    typeof value.action === "string" && typeof value.createdAt === "string";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function statusLabel(status: ProductStatus) {
  return STATUS_OPTIONS.find(([value]) => value === status)?.[1] ?? status;
}

function activityLabel(action: string) {
  const labels: Record<string, string> = { create: "Dibuat", update: "Diperbarui", delete: "Dihapus" };
  return labels[action] ?? action.replace(/[_-]+/g, " ");
}

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ query: string; message: string } | null>(null);
  const [detail, setDetail] = useState<{ product: Product; activities: ProductActivity[] } | null>(null);
  const [detailPagination, setDetailPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [detailPageSize, setDetailPageSize] = useState(50);
  const [detailLoading, setDetailLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const debouncedSearch = useDebounce(search);
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (date) { params.set("startDate", date); params.set("endDate", date); }
    if (branchId) params.set("branchId", branchId);
    return params.toString();
  }, [status, debouncedSearch, date, branchId]);
  const requestKey = `${filterQuery}|page=${page}|limit=${pageSize}|reload=${reloadKey}`;
  const loading = loadedRequestKey !== requestKey;
  const error = requestError?.query === requestKey ? requestError.message : "";

  useEffect(() => {
    let active = true;
    getAllApiPages("/products/branches", "branches", isBranch)
      .then((rows) => {
        if (!active) return;
        setBranches(rows);
        if (rows.length === 1 && rows[0]) setBranchId(String(rows[0].id));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(filterQuery);
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    getApi(`/products?${params.toString()}`)
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.products) || !data.products.every(isProduct) ||
          !isApiPagination(data.pagination)) {
          throw new Error("Data produk dari API tidak valid.");
        }
        if (active) {
          setProducts(data.products);
          setPagination(data.pagination);
          setPage(Math.min(page, Math.max(1, data.pagination.totalPages)));
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => { if (active) setRequestError({ query: requestKey, message: getApiError(cause) }); })
      .finally(() => { if (active) setLoadedRequestKey(requestKey); });
    return () => { active = false; };
  }, [filterQuery, page, pageSize, reloadKey, requestKey]);

  function clearFilters() {
    setPage(1);
    setStatus(""); setSearch(""); setDate("");
    setBranchId(branches.length === 1 && branches[0] ? String(branches[0].id) : "");
  }

  async function openDetail(product: Product, targetPage = 1, targetLimit = detailPageSize) {
    setDetailLoading(true);
    try {
      const { data } = await api.get<unknown>(`/products/${product.id}?page=${targetPage}&limit=${targetLimit}`);
      if (!isRecord(data) || !isProduct(data.product) || !Array.isArray(data.activityLogs) ||
        !data.activityLogs.every(isProductActivity) || !isApiPagination(data.activityPagination)) {
        throw new Error("Data detail dan riwayat aktivitas produk tidak valid.");
      }
      setDetail({ product: data.product, activities: data.activityLogs });
      setDetailPagination(data.activityPagination);
      setDetailPageSize(targetLimit);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Hapus produk varian “${product.variantName ?? "tidak diketahui"}” dengan barcode ${product.barcode}?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      setReloadKey((current) => current + 1);
      toast.success("Produk berhasil dihapus.");
    } catch (cause) {
      toast.error(getApiError(cause));
    }
  }

  return (
    <div className="dashboard-content products-content">
      <section className="dashboard-heading products-heading" aria-labelledby="products-title">
        <div><span className="dashboard-eyebrow">INVENTARIS</span><h1 id="products-title">Daftar Produk</h1><p>Pantau lokasi dan status setiap produk dari kode barcode.</p></div>
        <div className="products-heading-actions">
          <span className="products-count"><Package aria-hidden="true" /> {pagination.total} PRODUK</span>
          <Link className="products-generate-button" href="/main/products/generate"><PackagePlus aria-hidden="true" /> Generate Produk</Link>
        </div>
      </section>

      <section className="products-panel" aria-labelledby="products-table-title">
        <header className="products-panel-header">
          <div><span className="dashboard-eyebrow">DATA PRODUK</span><h2 id="products-table-title">Semua produk <span>{pagination.total}</span></h2><p>Gunakan filter untuk menemukan produk yang dibutuhkan.</p></div>
          <div className="products-filters">
            <label className="products-search"><Search aria-hidden="true" /><span className="sr-only">Cari nama varian atau kode QR</span><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Nama varian / kode QR" /></label>
            <label className="products-filter-field"><span className="sr-only">Filter status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">Semua Status</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="products-filter-field products-date"><CalendarDays aria-hidden="true" /><span className="sr-only">Filter tanggal update</span><input type="date" value={date} onChange={(event) => { setPage(1); setDate(event.target.value); }} /></label>
            <label className="products-filter-field"><span className="sr-only">Filter cabang</span><select value={branchId} onChange={(event) => { setPage(1); setBranchId(event.target.value); }}>{branches.length !== 1 && <option value="">Semua Cabang</option>}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <button className="products-clear-button" type="button" onClick={clearFilters}><RotateCcw aria-hidden="true" /> Bersihkan Filter</button>
          </div>
        </header>
        {error && <p className="products-error" role="alert">{error}</p>}
        <div className="products-table-wrap"><table className="products-table">
          <thead><tr><th>No</th><th>Varian</th><th>Kode Barcode</th><th>Cabang</th><th>Status</th><th>Tanggal Update</th><th>Aksi</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="products-state" colSpan={7}>Memuat daftar produk…</td></tr> : error ? <tr><td className="products-state" colSpan={7}>Data produk belum dapat dimuat.</td></tr> : products.length === 0 ? <tr><td className="products-state" colSpan={7}>{search || status || date || branchId ? "Produk tidak ditemukan untuk filter ini." : "Belum ada data produk."}</td></tr> : products.map((product, index) => (
              <tr key={product.id}><td className="products-number">{(pagination.page - 1) * pageSize + index + 1}</td><td className="products-name">{product.variantName ?? "Varian belum dipetakan"}</td><td className="products-barcode">{product.barcode}</td><td><span className="products-branch">{product.branch}</span></td><td><span className={`products-status status-${product.status}`}>{statusLabel(product.status)}</span></td><td className="products-updated">{dateLabel(product.updatedAt)}</td><td><div className="products-actions"><button className="products-action-button" type="button" onClick={() => void openDetail(product, 1)} disabled={detailLoading}><Eye aria-hidden="true" /> Detail</button><button className="products-action-button products-delete-button" type="button" onClick={() => void deleteProduct(product)}><Trash2 aria-hidden="true" /> Hapus</button></div></td></tr>
            ))}
          </tbody>
        </table></div>
        <ApiPagination
          page={pagination.page}
          limit={pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="produk"
          isLoading={loading}
          onPageChange={setPage}
          onLimitChange={(limit) => { setPage(1); setPageSize(limit); }}
        />
        <footer className="products-footer">Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}</footer>
      </section>

      <dialog className="products-dialog" ref={dialogRef} onClose={() => setDetail(null)} aria-labelledby="product-detail-title">
        <header className="products-dialog-header"><div><span className="dashboard-eyebrow">INFORMASI PRODUK</span><h2 id="product-detail-title">Detail Produk</h2></div><button className="products-dialog-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup detail"><X aria-hidden="true" /></button></header>
        {detail && <>
          <h3 className="products-dialog-section-title">Informasi Produk</h3>
          <dl className="products-detail-list">
            <div><dt>ID Varian</dt><dd>{detail.product.variantId ?? "—"}</dd></div>
            <div><dt>Nama Varian</dt><dd>{detail.product.variantName ?? "Varian belum dipetakan"}</dd></div>
            <div><dt>Kode Barcode</dt><dd>{detail.product.barcode}</dd></div>
            <div><dt>Status</dt><dd><span className={`products-status status-${detail.product.status}`}>{statusLabel(detail.product.status)}</span></dd></div>
            <div><dt>Dibuat Pada</dt><dd>{dateLabel(detail.product.createdAt)}</dd></div>
            <div><dt>Diupdate Pada</dt><dd>{dateLabel(detail.product.updatedAt)}</dd></div>
          </dl>
          <section className="products-history" aria-labelledby="products-history-title">
            <header className="products-history-header"><h3 id="products-history-title">List History Aktivitas</h3><span>Total Aktivitas <strong>{detailPagination.total}</strong></span></header>
            {detailLoading ? <p className="products-history-empty">Memuat riwayat aktivitas…</p> : detail.activities.length ? <div className="products-history-wrap"><table className="products-history-table"><thead><tr><th>Tanggal</th><th>User</th><th>Aktivitas</th></tr></thead><tbody>{detail.activities.map((activity) => <tr key={activity.id}><td>{dateLabel(activity.createdAt)}</td><td>{activity.username || "Pengguna tidak diketahui"}</td><td>{activityLabel(activity.action)}</td></tr>)}</tbody></table></div> : <p className="products-history-empty">Belum ada aktivitas untuk kode barcode ini.</p>}
            <ApiPagination
              page={detailPagination.page}
              limit={detailPageSize}
              total={detailPagination.total}
              totalPages={detailPagination.totalPages}
              itemLabel="aktivitas"
              isLoading={detailLoading}
              onPageChange={(nextPage) => void openDetail(detail.product, nextPage)}
              onLimitChange={(nextLimit) => void openDetail(detail.product, 1, nextLimit)}
            />
          </section>
        </>}
      </dialog>
    </div>
  );
}
