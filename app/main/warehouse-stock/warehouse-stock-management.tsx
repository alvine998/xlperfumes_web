"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Eye, Package, X } from "lucide-react";
import { getApi, getApiError } from "@/lib/api";

type WarehouseProduct = {
  id: number;
  name: string;
  barcode: string;
  branchId: number;
  branch: string;
  status: "di_gudang";
};
type WarehouseRow = {
  key: string;
  name: string;
  branchId: number;
  branch: string;
  products: WarehouseProduct[];
};
type Branch = { id: number; name: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is WarehouseProduct {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string" &&
    typeof value.barcode === "string" && typeof value.branchId === "number" &&
    typeof value.branch === "string" && value.status === "di_gudang";
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

export function WarehouseStockManagement() {
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState<WarehouseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getApi("/products?status=di_gudang"), getApi("/products/branches")])
      .then(([productsResponse, branchesResponse]) => {
        const productData: unknown = productsResponse.data;
        const branchData: unknown = branchesResponse.data;
        if (!isRecord(productData) || !Array.isArray(productData.products) || !productData.products.every(isProduct)) {
          throw new Error("Data stok gudang dari API tidak valid.");
        }
        if (!isRecord(branchData) || !Array.isArray(branchData.branches) || !branchData.branches.every(isBranch)) {
          throw new Error("Data cabang dari API tidak valid.");
        }
        if (active) {
          setProducts(productData.products);
          setBranches(branchData.branches);
        }
      })
      .catch((cause: unknown) => { if (active) setError(getApiError(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const grouped = new Map<string, WarehouseRow>();
    for (const product of products) {
      const key = `${product.branchId}:${product.name}`;
      const row = grouped.get(key) ?? {
        key,
        name: product.name,
        branchId: product.branchId,
        branch: product.branch,
        products: [],
      };
      row.products.push(product);
      grouped.set(key, row);
    }
    return [...grouped.values()]
      .filter((row) => !branchId || String(row.branchId) === branchId)
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID") || a.branch.localeCompare(b.branch, "id-ID"));
  }, [products, branchId]);

  const totalUnits = rows.reduce((sum, row) => sum + row.products.length, 0);

  return (
    <div className="dashboard-content warehouse-stock-content">
      <section className="dashboard-heading warehouse-stock-heading" aria-labelledby="warehouse-stock-title">
        <div>
          <span className="dashboard-eyebrow">INVENTARIS GUDANG</span>
          <h1 id="warehouse-stock-title">Stok Gudang</h1>
          <p>Pantau jumlah barang yang tersedia di gudang setiap cabang.</p>
        </div>
        <div className="warehouse-stock-heading-actions">
          <span className="warehouse-stock-total"><Package aria-hidden="true" /> {totalUnits.toLocaleString("id-ID")} UNIT</span>
          <Link className="warehouse-stock-action incoming" href="/main/warehouse-stock/movement/in"><ArrowDownToLine aria-hidden="true" /> Barang Masuk</Link>
          <Link className="warehouse-stock-action outgoing" href="/main/warehouse-stock/movement/out"><ArrowUpFromLine aria-hidden="true" /> Barang Keluar</Link>
        </div>
      </section>

      <section className="warehouse-stock-panel" aria-labelledby="warehouse-stock-table-title">
        <header className="warehouse-stock-panel-header">
          <div>
            <span className="dashboard-eyebrow">DAFTAR PERSEDIAAN</span>
            <h2 id="warehouse-stock-table-title">Barang di gudang <span>{rows.length}</span></h2>
            <p>Jumlah dihitung dari unit produk dengan status Di Gudang.</p>
          </div>
          <label className="warehouse-stock-filter">
            <span className="sr-only">Filter cabang</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">Semua Cabang</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
        </header>

        <div className="warehouse-stock-table-wrap">
          <table className="warehouse-stock-table">
            <thead><tr><th>Nama Barang</th><th>Cabang</th><th>Jumlah</th><th>Satuan</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="warehouse-stock-state" colSpan={5}>Memuat stok gudang…</td></tr>
                : error ? <tr><td className="warehouse-stock-state" colSpan={5} role="alert">Gagal memuat stok: {error}</td></tr>
                  : rows.length === 0 ? <tr><td className="warehouse-stock-state" colSpan={5}>{branchId ? "Tidak ada stok gudang untuk cabang ini." : "Belum ada barang berstatus Di Gudang."}</td></tr>
                    : rows.map((row) => (
                      <tr key={row.key}>
                        <td><strong className="warehouse-stock-name">{row.name}</strong></td>
                        <td><span className="warehouse-stock-branch">{row.branch}</span></td>
                        <td><span className="warehouse-stock-quantity">{row.products.length.toLocaleString("id-ID")}</span></td>
                        <td>pcs</td>
                        <td><div className="warehouse-stock-row-actions">
                          <Link className="warehouse-row-action" href="/main/warehouse-stock/movement/in"><ArrowDownToLine aria-hidden="true" /> Tambah</Link>
                          <Link className="warehouse-row-action reduce" href="/main/warehouse-stock/movement/out"><ArrowUpFromLine aria-hidden="true" /> Kurangi</Link>
                          <button className="warehouse-row-action check" type="button" onClick={() => setSelected(row)}><Eye aria-hidden="true" /> Cek Stok Gudang</button>
                        </div></td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        <footer className="warehouse-stock-footer">Menampilkan <strong>{rows.length}</strong> jenis barang · <strong>{totalUnits.toLocaleString("id-ID")}</strong> unit</footer>
      </section>

      {selected && <div className="warehouse-stock-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="warehouse-stock-dialog" role="dialog" aria-modal="true" aria-labelledby="warehouse-stock-dialog-title">
          <header><div><span className="dashboard-eyebrow">RINCIAN PERSEDIAAN</span><h2 id="warehouse-stock-dialog-title">{selected.name}</h2><p>{selected.branch} · {selected.products.length.toLocaleString("id-ID")} pcs di gudang</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Tutup rincian"><X aria-hidden="true" /></button></header>
          <div className="warehouse-stock-detail-list">
            {selected.products.map((product) => <div key={product.id}><Package aria-hidden="true" /><span>{product.barcode}</span><small>Di Gudang</small></div>)}
          </div>
          <footer><button type="button" className="warehouse-stock-close" onClick={() => setSelected(null)}>Tutup</button></footer>
        </section>
      </div>}
    </div>
  );
}
