"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { getApiError } from "@/lib/api";
import { getAllApiPages } from "@/lib/pagination";
import { ProductBarcodePrintSheets } from "./product-barcode-print-sheets";
import { ProductBarcodeCard } from "./product-barcode-card";
import { printProductBarcodes } from "./product-barcode-print";
import {
  ProductBarcodeFilters,
  type BarcodeBranchOption,
  type BarcodeVariantOption,
  type PrintMode,
  type ProductBarcodeFilterChange,
} from "./product-barcode-filters";

type Product = { id: number; variantId: number | null; variantName: string | null; barcode: string; branchId: number; branch: string; createdAt: string; updatedAt: string };
type Branch = BarcodeBranchOption;
type Variant = BarcodeVariantOption;
type QrState = { query: string | null; codes: Record<string, string>; ready: boolean; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.barcode === "string" && typeof value.branchId === "number" &&
    typeof value.branch === "string" && typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string";
}

function isBranch(value: unknown): value is Branch {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function isVariant(value: unknown): value is Variant {
  return isRecord(value) && typeof value.id === "number" &&
    typeof value.name === "string" && typeof value.branchId === "number";
}

export function ProductBarcodes() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [totalData, setTotalData] = useState(500);
  const [printMode, setPrintMode] = useState<PrintMode>("normal");
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ query: string; message: string } | null>(null);
  const [qrState, setQrState] = useState<QrState>({ query: null, codes: {}, ready: false, error: "" });

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams({ total_data: String(totalData) });
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (branchId) params.set("branchId", branchId);
    if (variantId) params.set("variantId", variantId);
    return params.toString();
  }, [startDate, endDate, branchId, variantId, totalData]);

  const loading = loadedQuery !== filterQuery;
  const error = requestError?.query === filterQuery ? requestError.message : "";
  const qrError = qrState.query === filterQuery ? qrState.error : "";

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllApiPages("/products/branches", "branches", isBranch),
      getAllApiPages("/variants", "variants", isVariant),
    ])
      .then(([branchRows, variantRows]) => {
        if (active) {
          setBranches(branchRows);
          setVariants(variantRows);
        }
      })
      .catch((cause: unknown) => { if (active) setFilterOptionsError(getApiError(cause)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getAllApiPages(`/products?${filterQuery}`, "products", isProduct, 100, totalData)
      .then((productRows) => {
        if (active) {
          setProducts(productRows);
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setProducts([]);
          setRequestError({ query: filterQuery, message: getApiError(cause) });
        }
      })
      .finally(() => { if (active) setLoadedQuery(filterQuery); });
    return () => { active = false; };
  }, [filterQuery, totalData]);

  useEffect(() => {
    if (!loadedQuery || loading || error) return;
    let active = true;
    void Promise.resolve().then(async () => {
      const codes: Record<string, string> = {};
      for (let offset = 0; offset < products.length; offset += 80) {
        const batch = await Promise.all(products.slice(offset, offset + 80).map(async (product) => [
          product.barcode,
          await QRCode.toDataURL(product.barcode, {
            errorCorrectionLevel: "M", margin: 1, width: 180,
            color: { dark: "#20221b", light: "#ffffff" },
          }),
        ] as const));
        if (!active) return;
        Object.assign(codes, Object.fromEntries(batch));
        setQrState({ query: loadedQuery, codes: { ...codes }, ready: false, error: "" });
      }
      if (active) setQrState({ query: loadedQuery, codes, ready: true, error: "" });
    }).catch(() => {
      if (active) setQrState({ query: loadedQuery, codes: {}, ready: true, error: "Kode QR tidak dapat dibuat." });
    });
    return () => { active = false; };
  }, [products, loadedQuery, loading, error]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    products.forEach((product) => {
      const name = product.variantName?.trim() || "Varian belum dipetakan";
      const items = grouped.get(name);
      if (items) items.push(product);
      else grouped.set(name, [product]);
    });
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "id"))
      .map(([name, items]) => ({ name, products: items }));
  }, [products]);
  const orderedProducts = useMemo(() => groups.flatMap((group) => group.products), [groups]);
  const qrReady = !loading && qrState.query === filterQuery && qrState.ready && !qrError;

  function handleFilterChange(change: ProductBarcodeFilterChange) {
    if (change.field === "startDate") setStartDate(change.value);
    else if (change.field === "endDate") setEndDate(change.value);
    else if (change.field === "branchId") { setBranchId(change.value); setVariantId(""); }
    else if (change.field === "variantId") setVariantId(change.value);
    else if (change.field === "totalData") setTotalData(change.value);
    else if (change.field === "printMode") setPrintMode(change.value);
  }

  return (
    <section className="dashboard-content product-barcodes-content" aria-labelledby="product-barcodes-title">
      <div className="dashboard-heading product-barcodes-heading">
        <div><span className="dashboard-eyebrow">INVENTARIS</span><h1 id="product-barcodes-title">Cetak Barcode Produk</h1><p>Kode QR setiap produk siap dicetak berdasarkan varian dan cabang.</p></div>
        <button className="product-barcodes-print-all" type="button" onClick={() => printProductBarcodes(printMode, "all")} disabled={!qrReady || products.length === 0}>
          <Printer aria-hidden="true" /> Cetak Semua Kode QR
        </button>
      </div>

      <section className="product-barcodes-panel" aria-label="Pilihan dan daftar barcode produk">
        <ProductBarcodeFilters
          values={{ startDate, endDate, branchId, variantId, totalData, printMode }}
          branches={branches}
          variants={variants}
          onChange={handleFilterChange}
        />

        {filterOptionsError && <p className="product-barcodes-state product-barcodes-error" role="alert">Pilihan cabang dan varian belum dapat dimuat: {filterOptionsError}</p>}
        {error ? <p className="product-barcodes-state product-barcodes-error" role="alert">{error}</p>
          : loading ? <p className="product-barcodes-state" role="status">Memuat produk…</p>
            : products.length === 0 ? <p className="product-barcodes-state">Tidak ada produk untuk filter ini.</p>
              : <div className="product-barcode-groups">
                {groups.map((group, groupIndex) => <section className="product-barcode-group" key={group.name} aria-labelledby={`product-barcode-group-${groupIndex}`}>
                  <header className="product-barcode-group-heading"><div><span>NAMA VARIAN</span><h2 id={`product-barcode-group-${groupIndex}`}>{group.name}</h2></div><strong>{group.products.length.toLocaleString("id-ID")} produk</strong></header>
                  <div className="product-barcode-grid">{group.products.map((product) => <ProductBarcodeCard
                    key={product.id}
                    barcode={product.barcode}
                    qrCode={qrState.codes[product.barcode]}
                    onPrint={() => printProductBarcodes(printMode, "single", product.id)}
                  />)}</div>
                </section>)}
              </div>}
        {qrError && <p className="product-barcodes-state product-barcodes-error" role="alert">{qrError}</p>}
        <footer className="product-barcodes-footer">Menampilkan <strong>{products.length.toLocaleString("id-ID")}</strong> produk dari maksimal <strong>{totalData.toLocaleString("id-ID")}</strong>.</footer>
      </section>
      <ProductBarcodePrintSheets products={orderedProducts} qrCodes={qrState.codes} mode={printMode} />
    </section>
  );
}
