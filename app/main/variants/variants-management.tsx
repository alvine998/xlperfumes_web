"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";

type Variant = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  branchId: number | null;
  branchName: string | null;
  createdAt: string;
};
type Branch = { id: number; name: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVariant(value: unknown): value is Variant {
  return isRecord(value) && typeof value.id === "number" &&
    typeof value.name === "string" && typeof value.quantity === "number" &&
    typeof value.unit === "string" && typeof value.unitPrice === "number" &&
    (typeof value.branchId === "number" || value.branchId === null) &&
    (typeof value.branchName === "string" || value.branchName === null) &&
    typeof value.createdAt === "string";
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function formatThousands(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseThousands(value: string) {
  return Number(value.replace(/\./g, ""));
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function VariantsManagement() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [query, setQuery] = useState("");
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getApi("/variants"), getApi("/products/branches")])
      .then(([variantsResponse, branchesResponse]) => {
        const variantsData: unknown = variantsResponse.data;
        const branchesData: unknown = branchesResponse.data;
        if (!isRecord(variantsData) || !Array.isArray(variantsData.variants) || !variantsData.variants.every(isVariant)) {
          throw new Error("Data varian dari API tidak valid.");
        }
        if (!isRecord(branchesData) || !Array.isArray(branchesData.branches) || !branchesData.branches.every(isBranch)) {
          throw new Error("Data cabang dari API tidak valid.");
        }
        if (active) {
          setVariants(variantsData.variants);
          setBranches(branchesData.branches);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(getApiError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredVariants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return variants.filter((variant) =>
      variant.name.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }, [variants, query]);

  function openCreate() {
    setEditingVariant(null);
    setQuantityInput("");
    setUnitPriceInput("");
    dialogRef.current?.showModal();
  }

  function openEdit(variant: Variant) {
    setEditingVariant(variant);
    setQuantityInput(formatThousands(variant.quantity));
    setUnitPriceInput(formatThousands(variant.unitPrice));
    dialogRef.current?.showModal();
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") ?? "").trim(),
      quantity: parseThousands(String(formData.get("quantity") ?? "")),
      unit: String(formData.get("unit") ?? "").trim(),
      unitPrice: parseThousands(String(formData.get("unitPrice") ?? "")),
      branchId: Number(formData.get("branchId")),
    };
    setSaving(true);
    try {
      const response = await api.request<unknown>({
        url: editingVariant ? `/variants/${editingVariant.id}` : "/variants",
        method: editingVariant ? "PATCH" : "POST",
        data: body,
      });
      const payload = response.data;
      if (!isRecord(payload) || !isVariant(payload.variant)) {
        throw new Error("Data varian hasil penyimpanan tidak valid.");
      }
      const saved = payload.variant;
      setVariants((current) => editingVariant
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      dialogRef.current?.close();
      toast.success(editingVariant ? "Perubahan varian tersimpan." : "Varian berhasil ditambahkan.");
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variant: Variant) {
    if (!window.confirm(`Hapus varian ${variant.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await api.delete(`/variants/${variant.id}`);
      setVariants((current) => current.filter((item) => item.id !== variant.id));
      toast.success("Varian berhasil dihapus.");
    } catch (cause) {
      toast.error(getApiError(cause));
    }
  }

  return (
    <div className="dashboard-content variants-content">
      <section className="dashboard-heading variants-heading" aria-labelledby="variants-title">
        <div>
          <span className="dashboard-eyebrow">KATALOG PRODUK</span>
          <h1 id="variants-title">Daftar Varian</h1>
          <p>Kelola cabang, nama varian, jumlah, satuan, dan harga satuan.</p>
        </div>
        <div className="variants-heading-actions">
          <span className="variants-count"><Package aria-hidden="true" /> {variants.length} VARIAN</span>
          <button className="variants-primary-button" type="button" onClick={openCreate}>
            <Plus size={17} aria-hidden="true" /> Tambah varian
          </button>
        </div>
      </section>

      <section className="variants-table-section" aria-labelledby="variants-table-title">
        <header className="variants-table-header">
          <div>
            <span className="dashboard-eyebrow">DATA INVENTARIS</span>
            <h2 id="variants-table-title">Semua varian <span>{filteredVariants.length}</span></h2>
            <p>Daftar varian produk dan harga yang berlaku.</p>
          </div>
          <label className="variants-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari nama varian</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama varian" />
          </label>
        </header>

        {error && <p className="variants-error" role="alert">{error}</p>}
        <div className="variants-table-wrap">
          <table className="variants-table">
            <thead><tr><th>Nama Varian</th><th>Cabang</th><th>Jumlah</th><th>Satuan</th><th>Harga Satuan</th><th><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>
              {loading ? <tr><td className="variants-state" colSpan={6}>Memuat daftar varian…</td></tr> : error ? <tr><td className="variants-state" colSpan={6}>Data varian belum dapat dimuat.</td></tr> : filteredVariants.length === 0 ? <tr><td className="variants-state" colSpan={6}>{query ? "Varian tidak ditemukan." : "Belum ada varian. Tambahkan varian pertama Anda."}</td></tr> : filteredVariants.map((variant) => (
                <tr key={variant.id}>
                  <td className="variants-name">{variant.name}</td>
                  <td>{variant.branchName ?? "Belum ditentukan"}</td>
                  <td className="variants-quantity">{variant.quantity.toLocaleString("id-ID")}</td>
                  <td>{variant.unit}</td>
                  <td className="variants-price">{rupiah.format(variant.unitPrice)}</td>
                  <td><div className="variants-row-actions">
                    <button className="variants-icon-button" type="button" onClick={() => openEdit(variant)} aria-label={`Ubah ${variant.name}`}><Pencil aria-hidden="true" /></button>
                    <button className="variants-icon-button variants-delete-button" type="button" onClick={() => void handleDelete(variant)} aria-label={`Hapus ${variant.name}`}><Trash2 aria-hidden="true" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="variants-table-footer">Menampilkan <strong>{filteredVariants.length}</strong> dari <strong>{variants.length}</strong> varian</footer>
      </section>

      <dialog className="variants-dialog" ref={dialogRef} onClose={() => setEditingVariant(null)} aria-labelledby="variant-form-title">
          <form key={editingVariant?.id ?? "new-variant"} onSubmit={handleSave}>
          <header className="variants-dialog-header">
            <div><span className="dashboard-eyebrow">FORM VARIAN</span><h2 id="variant-form-title">{editingVariant ? "Ubah varian" : "Tambah varian"}</h2></div>
            <button className="variants-close-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup form"><X aria-hidden="true" /></button>
          </header>
          <div className="variants-form-fields">
            <label>Nama Varian<input name="name" required maxLength={150} defaultValue={editingVariant?.name ?? ""} placeholder="Contoh: Eau de Parfum 50 ml" /></label>
            <label>Cabang<select name="branchId" required defaultValue={editingVariant?.branchId?.toString() ?? ""}><option value="" disabled>Pilih cabang</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <div className="variants-form-grid">
              <label>Jumlah<input name="quantity" type="text" inputMode="numeric" pattern="[0-9.]*" required value={quantityInput} onChange={(event) => setQuantityInput(formatThousands(event.target.value))} placeholder="0" /></label>
              <label>Satuan<input name="unit" required maxLength={40} defaultValue={editingVariant?.unit ?? ""} placeholder="Contoh: pcs" /></label>
            </div>
            <label>Harga Satuan<input name="unitPrice" type="text" inputMode="numeric" pattern="[0-9.]*" required value={unitPriceInput} onChange={(event) => setUnitPriceInput(formatThousands(event.target.value))} placeholder="0" /></label>
          </div>
          <footer className="variants-dialog-actions">
            <button className="variants-cancel-button" type="button" onClick={() => dialogRef.current?.close()}>Batal</button>
            <button className="variants-primary-button" type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan varian"}</button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
