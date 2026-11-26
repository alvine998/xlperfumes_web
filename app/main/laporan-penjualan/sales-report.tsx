"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";
import { ApiPagination } from "@/components/ui/api-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getAllApiPages, isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";

const STATUS_OPTIONS = [
  ["terjual", "Terjual"], ["pending", "Pending"], ["di_gudang", "Di Gudang"], ["di_toko", "Di Toko"],
  ["di_spg", "Di SPG"], ["di_collecting", "Di Collecting"], ["rusak", "Rusak"],
] as const;
type ProductStatus = (typeof STATUS_OPTIONS)[number][0];
type TargetStatus = Exclude<ProductStatus, "terjual">;
type Product = { id: number; variantId: number | null; variantName: string | null; barcode: string; branch: string; status: ProductStatus; updatedAt: string };
type Branch = { id: number; name: string };
type Variant = { id: number; name: string; branchId: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.barcode === "string" && typeof value.branch === "string" &&
    STATUS_OPTIONS.some(([status]) => status === value.status) && typeof value.updatedAt === "string";
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function isVariant(value: unknown): value is Variant {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string" && typeof value.branchId === "number";
}

function isTargetStatus(value: string): value is TargetStatus {
  return value !== "terjual" && STATUS_OPTIONS.some(([status]) => status === value);
}

export function SalesReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [branchId, setBranchId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [status, setStatus] = useState("terjual");
  const [search, setSearch] = useState("");
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [targets, setTargets] = useState<Record<number, TargetStatus>>({});
  const debouncedSearch = useDebounce(search);
  const visibleVariants = variants.filter((variant) => !branchId || String(variant.branchId) === branchId);
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", branchId);
    if (variantId) params.set("variantId", variantId);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    return params.toString();
  }, [status, branchId, variantId, debouncedSearch]);
  const requestKey = `${filterQuery}:${page}:${reload}`;
  const loading = loadedRequest !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllApiPages("/products/branches", "branches", isBranch),
      getAllApiPages("/variants", "variants", isVariant),
    ])
      .then(([branchRows, variantRows]) => {
        if (!active) return;
        setBranches(branchRows);
        setVariants(variantRows);
        if (branchRows.length === 1 && branchRows[0]) setBranchId(String(branchRows[0].id));
      })
      .catch((reason: unknown) => { if (active) setFilterOptionsError(getApiError(reason)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(filterQuery);
    params.set("page", String(page));
    params.set("limit", "50");
    getApi(`/products?${params.toString()}`)
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
  }, [page, reload, requestKey, filterQuery]);

  async function updateStatus(product: Product) {
    const status = targets[product.id];
    if (!status || product.status !== "terjual" || saving !== null) return;
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
        <div><span className="dashboard-eyebrow">LAPORAN</span><h1 id="sales-report-title">Laporan Penjualan</h1><p>Pantau produk dan kelola status penjualan dengan filter yang tersedia.</p></div>
        <div className="sales-report-count"><strong>{new Intl.NumberFormat("id-ID").format(pagination.total)}</strong><span>{status ? STATUS_OPTIONS.find(([value]) => value === status)?.[1] : "Semua status"}</span></div>
      </div>
      <div className="sales-report-panel">
        <div className="sales-report-panel-heading"><div><h2>Produk sesuai filter</h2><p>Perubahan status tersedia untuk admin dan owner.</p></div><button type="button" className="sales-report-refresh" onClick={() => setReload((value) => value + 1)} disabled={loading}><RotateCcw aria-hidden="true" /> Muat ulang</button></div>
        <div className="sales-report-filters">
          <label className="sales-report-search"><Search aria-hidden="true" /><span className="sr-only">Cari nama varian atau barcode</span><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Cari nama varian / barcode" /></label>
          <label className="sales-report-filter"><span className="sr-only">Filter varian</span><select value={variantId} onChange={(event) => { setPage(1); setVariantId(event.target.value); }}><option value="">Semua Varian</option>{visibleVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
          <label className="sales-report-filter"><span className="sr-only">Filter cabang</span><select value={branchId} onChange={(event) => { setPage(1); setBranchId(event.target.value); if (variantId && !variants.some((variant) => String(variant.id) === variantId && (!event.target.value || String(variant.branchId) === event.target.value))) setVariantId(""); }}>{branches.length !== 1 && <option value="">Semua Cabang</option>}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="sales-report-filter"><span className="sr-only">Filter status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">Semua Status</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button type="button" className="sales-report-clear" onClick={() => { setPage(1); setStatus("terjual"); setSearch(""); setBranchId(branches.length === 1 && branches[0] ? String(branches[0].id) : ""); setVariantId(""); }}>Bersihkan filter</button>
        </div>
        {filterOptionsError && <p className="sales-report-error" role="alert">Filter gagal dimuat: {filterOptionsError}</p>}
        {error && <p className="sales-report-error" role="alert">Laporan gagal dimuat: {error}</p>}
        <div className="sales-report-table-wrap">
          <table className="sales-report-table">
            <thead><tr><th>No.</th><th>Varian</th><th>Barcode</th><th>Cabang</th><th>Status</th><th>Ubah Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="sales-report-state" role="status">Memuat laporan…</td></tr>
                : error ? <tr><td colSpan={7} className="sales-report-state">Data belum dapat ditampilkan.</td></tr>
                  : products.length === 0 ? <tr><td colSpan={7} className="sales-report-state">Tidak ada produk untuk filter ini.</td></tr>
                    : products.map((product, index) => (
                      <tr key={product.id}>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td className="sales-report-name">{product.variantName ?? "Varian belum dipetakan"}</td>
                        <td className="sales-report-barcode">{product.barcode}</td>
                        <td>{product.branch}</td>
                        <td><span className={`sales-report-status sales-report-status-${product.status}`}>{STATUS_OPTIONS.find(([value]) => value === product.status)?.[1] ?? product.status}</span></td>
                        <td>{product.status === "terjual" ? <><label className="sr-only" htmlFor={`sales-status-${product.id}`}>Status baru untuk {product.barcode}</label><select id={`sales-status-${product.id}`} value={targets[product.id] ?? ""} onChange={(event) => { const value = event.target.value; if (isTargetStatus(value)) setTargets((current) => ({ ...current, [product.id]: value })); }}><option value="" disabled>Pilih status</option>{STATUS_OPTIONS.filter(([value]) => value !== "terjual").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></> : "—"}</td>
                        <td>{product.status === "terjual" ? <button type="button" className="sales-report-save" onClick={() => void updateStatus(product)} disabled={!targets[product.id] || saving !== null}>{saving === product.id ? "Menyimpan…" : <><Check aria-hidden="true" /> Simpan</>}</button> : "—"}</td>
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
