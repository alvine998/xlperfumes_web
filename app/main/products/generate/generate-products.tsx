"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackagePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";

type Branch = { id: number; name: string };
type Variant = { id: number; name: string; branchId: number };
type CreatedProduct = { id: number; barcode: string };
type GenerationResult = { count: number; branchName: string; variantName: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function isVariant(value: unknown): value is Variant {
  return isRecord(value) && typeof value.id === "number" &&
    typeof value.name === "string" && typeof value.branchId === "number";
}

function isCreatedProduct(value: unknown): value is CreatedProduct {
  return isRecord(value) && typeof value.id === "number" && typeof value.barcode === "string";
}

function formatThousands(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseThousands(value: string) {
  return Number(value.replace(/\./g, ""));
}

export function GenerateProducts() {
  const router = useRouter();
  const successDialogRef = useRef<HTMLDialogElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [variantResult, setVariantResult] = useState<{
    branchId: number;
    variants: Variant[];
    error: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    let active = true;
    getApi("/products/branches")
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.branches) || !data.branches.every(isBranch)) {
          throw new Error("Data cabang dari API tidak valid.");
        }
        if (active) setBranches(data.branches);
      })
      .catch((cause: unknown) => {
        if (active) setBranchesError(getApiError(cause));
      })
      .finally(() => {
        if (active) setBranchesLoaded(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const selectedBranchId = Number(branchId);
    if (!Number.isInteger(selectedBranchId) || selectedBranchId < 1) return;

    let active = true;
    const params = new URLSearchParams({ branchId: String(selectedBranchId) });
    getApi("/variants?" + params.toString())
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.variants) || !data.variants.every(isVariant)) {
          throw new Error("Data varian dari API tidak valid.");
        }
        if (active) {
          setVariantResult({ branchId: selectedBranchId, variants: data.variants, error: "" });
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setVariantResult({
            branchId: selectedBranchId,
            variants: [],
            error: getApiError(cause),
          });
        }
      });
    return () => { active = false; };
  }, [branchId]);

  const selectedBranchId = Number(branchId);
  const currentVariantResult = variantResult?.branchId === selectedBranchId ? variantResult : null;
  const variants = currentVariantResult?.variants ?? [];
  const variantsLoading = Boolean(branchId) && currentVariantResult === null;
  const variantsError = currentVariantResult?.error ?? "";
  const quantity = parseThousands(quantityInput);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const selectedVariant = variants.find((variant) => variant.id === Number(variantId));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranch || !selectedVariant || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post<unknown>("/products/generate", {
        branchId: selectedBranch.id,
        variantId: selectedVariant.id,
        quantity,
      });
      if (!isRecord(data) || typeof data.count !== "number" || data.count !== quantity || !Array.isArray(data.products) ||
        data.products.length !== quantity || !data.products.every(isCreatedProduct)) {
        throw new Error("Data hasil generate produk tidak valid.");
      }
      setResult({
        count: data.count,
        branchName: selectedBranch.name,
        variantName: selectedVariant.name,
      });
      successDialogRef.current?.showModal();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setSaving(false);
    }
  }

  function startNewBatch() {
    successDialogRef.current?.close();
    setBranchId("");
    setVariantId("");
    setQuantityInput("1");
    setVariantResult(null);
  }

  return (
    <div className="dashboard-content product-generate-content">
      <section className="dashboard-heading product-generate-heading" aria-labelledby="generate-products-title">
        <div>
          <span className="dashboard-eyebrow">INVENTARIS</span>
          <h1 id="generate-products-title">Generate Produk</h1>
          <p>Buat beberapa produk sekaligus berdasarkan cabang dan varian.</p>
        </div>
      </section>

      <section className="product-generate-panel" aria-labelledby="generate-form-title">
        <header className="product-generate-panel-header">
          <span className="product-generate-icon"><PackagePlus aria-hidden="true" /></span>
          <div>
            <span className="dashboard-eyebrow">DATA PRODUK BARU</span>
            <h2 id="generate-form-title">Tentukan jumlah produk</h2>
            <p>Setiap produk akan mendapat kode barcode unik dan status Pending.</p>
          </div>
        </header>

        {branchesError && <p className="product-generate-error" role="alert">{branchesError}</p>}
        <form className="product-generate-form" onSubmit={handleSubmit}>
          <label className="product-generate-field">
            <span>Cabang</span>
            <select
              required
              value={branchId}
              disabled={!branchesLoaded || Boolean(branchesError)}
              onChange={(event) => {
                setBranchId(event.target.value);
                setVariantId("");
                setVariantResult(null);
              }}
            >
              <option value="" disabled>{branchesLoaded ? "Pilih cabang" : "Memuat cabang…"}</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>

          <label className="product-generate-field">
            <span>Varian</span>
            <select
              required
              value={variantId}
              disabled={!branchId || variantsLoading || Boolean(variantsError) || variants.length === 0}
              onChange={(event) => setVariantId(event.target.value)}
            >
              <option value="" disabled>
                {!branchId ? "Pilih cabang terlebih dahulu" : variantsLoading ? "Memuat varian…" : "Pilih varian"}
              </option>
              {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
            </select>
            {variantsError
              ? <small className="product-generate-field-error" role="alert">{variantsError}</small>
              : branchId && !variantsLoading && variants.length === 0
                ? <small>Belum ada varian untuk cabang ini. Atur di <Link href="/main/variants">Daftar Varian</Link>.</small>
                : <small>Daftar varian mengikuti cabang yang dipilih.</small>}
          </label>

          <label className="product-generate-field product-generate-quantity">
            <span>Jumlah Produk</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              value={quantityInput}
              onChange={(event) => setQuantityInput(formatThousands(event.target.value))}
              aria-describedby="generate-quantity-help"
            />
            <small id="generate-quantity-help">Masukkan 1 sampai 500 produk untuk setiap proses.</small>
          </label>

          <footer className="product-generate-actions">
            <button className="product-generate-submit" type="submit" disabled={
              saving || !selectedBranch || !selectedVariant || !Number.isInteger(quantity) || quantity < 1 || quantity > 500
            }>
              <PackagePlus aria-hidden="true" />{saving ? "Membuat produk…" : "Generate Produk"}
            </button>
          </footer>
        </form>
      </section>

      <dialog
        className="product-generate-dialog"
        ref={successDialogRef}
        onClose={() => setResult(null)}
        aria-labelledby="generate-success-title"
      >
        <header className="product-generate-dialog-header">
          <div><span className="dashboard-eyebrow">GENERATE BERHASIL</span><h2 id="generate-success-title">Produk berhasil dibuat</h2></div>
          <button className="product-generate-close" type="button" onClick={() => successDialogRef.current?.close()} aria-label="Tutup dialog"><X aria-hidden="true" /></button>
        </header>
        {result && <p className="product-generate-success-copy">
          {result.count.toLocaleString("id-ID")} produk varian <strong>{result.variantName}</strong> untuk cabang <strong>{result.branchName}</strong> sudah dibuat. Pilih Generate untuk melihat Daftar Produk, atau buat batch baru.
        </p>}
        <footer className="product-generate-dialog-actions">
          <button className="product-generate-submit" type="button" onClick={() => router.push("/main/products")}>Generate</button>
          <button className="product-generate-new" type="button" onClick={startNewBatch}>Generate &amp; Buat Baru</button>
          <button className="product-generate-cancel" type="button" onClick={() => successDialogRef.current?.close()}>Cancel</button>
        </footer>
      </dialog>
    </div>
  );
}
