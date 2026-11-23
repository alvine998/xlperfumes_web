"use client";

import { CalendarDays } from "lucide-react";

export type PrintMode = "normal" | "cutting";
export type BarcodeBranchOption = { id: number; name: string };
export type BarcodeVariantOption = { id: number; name: string; branchId: number };
export type ProductBarcodeFilterValues = {
  startDate: string;
  endDate: string;
  branchId: string;
  variantId: string;
  totalData: number;
  printMode: PrintMode;
};
export type ProductBarcodeFilterChange =
  | { field: "startDate" | "endDate" | "branchId" | "variantId"; value: string }
  | { field: "totalData"; value: number }
  | { field: "printMode"; value: PrintMode };

const TOTAL_DATA_OPTIONS = [500, 1000, 1500, 2000] as const;

function isTotalData(value: number): boolean {
  return TOTAL_DATA_OPTIONS.some((option) => option === value);
}

type ProductBarcodeFiltersProps = {
  values: ProductBarcodeFilterValues;
  branches: BarcodeBranchOption[];
  variants: BarcodeVariantOption[];
  onChange: (change: ProductBarcodeFilterChange) => void;
};

export function ProductBarcodeFilters({ values, branches, variants, onChange }: ProductBarcodeFiltersProps) {
  const visibleVariants = variants.filter((variant) => !values.branchId || String(variant.branchId) === values.branchId);

  return (
    <div className="product-barcodes-filters">
      <label className="product-barcodes-filter"><span>Tanggal Mulai</span><span className="product-barcodes-date"><CalendarDays aria-hidden="true" /><input type="date" value={values.startDate} max={values.endDate || undefined} onChange={(event) => onChange({ field: "startDate", value: event.target.value })} /></span></label>
      <label className="product-barcodes-filter"><span>Tanggal Akhir</span><span className="product-barcodes-date"><CalendarDays aria-hidden="true" /><input type="date" value={values.endDate} min={values.startDate || undefined} onChange={(event) => onChange({ field: "endDate", value: event.target.value })} /></span></label>
      <label className="product-barcodes-filter"><span>Cabang</span><select value={values.branchId} onChange={(event) => onChange({ field: "branchId", value: event.target.value })}><option value="">Semua Cabang</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="product-barcodes-filter"><span>Varian</span><select value={values.variantId} onChange={(event) => onChange({ field: "variantId", value: event.target.value })}><option value="">Semua Varian</option>{visibleVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
      <label className="product-barcodes-filter"><span>Jumlah Data</span><select value={values.totalData} onChange={(event) => { const value = Number(event.target.value); if (isTotalData(value)) onChange({ field: "totalData", value }); }}>{TOTAL_DATA_OPTIONS.map((total) => <option key={total} value={total}>{total.toLocaleString("id-ID")}</option>)}</select></label>
      <div className="product-barcodes-filter product-barcodes-mode-wrap"><span>Mode Cetak</span><div className="product-barcodes-mode" role="group" aria-label="Mode cetak">
        <button type="button" aria-pressed={values.printMode === "normal"} onClick={() => onChange({ field: "printMode", value: "normal" })}>Mode Normal</button>
        <button type="button" aria-pressed={values.printMode === "cutting"} onClick={() => onChange({ field: "printMode", value: "cutting" })}>Mode Potong</button>
      </div></div>
    </div>
  );
}
