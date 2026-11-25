"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Package, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiError } from "@/lib/api";
import { isVisitStock, type VisitStock } from "./store-visit-stock-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatQuantity(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

export function StoreStockAdjustmentModal({
  storeId,
  stocks,
  onClose,
  onUpdated,
}: {
  storeId: number;
  stocks: VisitStock[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [variantId, setVariantId] = useState(() => String(stocks[0]?.variantId ?? ""));
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);
  const stock = stocks.find((row) => String(row.variantId) === variantId) ?? stocks[0] ?? null;

  useEffect(() => {
    quantityRef.current?.focus();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  async function submit() {
    const count = Number(quantity.replace(/\D/g, ""));
    if (!stock || !Number.isSafeInteger(count) || count < 1) {
      toast.error("Pilih varian dan isi jumlah stok yang valid.");
      return;
    }
    if (direction === "decrease" && count > stock.totalStock) {
      toast.error("Jumlah pengurangan melebihi stok yang tersedia.");
      return;
    }
    setSaving(true);
    let succeeded = false;
    try {
      const { data } = await api.patch<unknown>(
        `/store-stock/${storeId}/visit/stock/${stock.variantId}`,
        { direction, quantity: count },
      );
      if (!isRecord(data) || !isVisitStock(data.stock)) {
        throw new Error("Data stok hasil pembaruan tidak valid.");
      }
      toast.success("Stok toko berhasil diperbarui.");
      succeeded = true;
      onUpdated();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      if (!succeeded) setSaving(false);
    }
  }

  return typeof document === "undefined" ? null : createPortal(
    <div className="store-visit-stock-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="store-visit-stock-modal stock-adjustment-modal" role="dialog" aria-modal="true" aria-labelledby="visit-stock-modal-title" aria-describedby="visit-stock-modal-description">
        <header>
          <div><span className="dashboard-eyebrow">KUNJUNGAN TOKO</span><h2 id="visit-stock-modal-title">Update Stok Toko</h2><p id="visit-stock-modal-description">Sesuaikan jumlah stok untuk varian di toko ini.</p></div>
          <button type="button" className="store-visit-stock-modal-close" onClick={onClose} disabled={saving} aria-label="Tutup modal"><X aria-hidden="true" /></button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="store-visit-stock-modal-body stock-adjustment-body">
            <label className="store-visit-stock-modal-field" htmlFor={`visit-stock-variant-${storeId}`}>
              <span>Varian Parfum</span>
              <select id={`visit-stock-variant-${storeId}`} value={stock ? String(stock.variantId) : ""} onChange={(event) => setVariantId(event.target.value)} disabled={!stocks.length || saving}>
                {stocks.map((row) => <option key={row.variantId} value={row.variantId}>{row.variantName}</option>)}
              </select>
            </label>
            <div className="store-visit-stock-modal-current"><span>Stok Saat Ini</span><strong>{stock ? `${stock.totalStock.toLocaleString("id-ID")} pcs` : "Tidak tersedia"}</strong></div>
            <fieldset className="store-visit-stock-direction">
              <legend>Arah Penyesuaian</legend>
              <button className={direction === "increase" ? "is-selected increase" : "increase"} type="button" onClick={() => setDirection("increase")} disabled={saving}><ArrowUp aria-hidden="true" /> Tambah Stok</button>
              <button className={direction === "decrease" ? "is-selected decrease" : "decrease"} type="button" onClick={() => setDirection("decrease")} disabled={saving}><ArrowDown aria-hidden="true" /> Kurangi Stok</button>
            </fieldset>
            <label className="store-visit-stock-modal-field" htmlFor={`visit-stock-adjustment-quantity-${storeId}`}>
              <span>Jumlah (pcs)</span>
              <input id={`visit-stock-adjustment-quantity-${storeId}`} ref={quantityRef} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(formatQuantity(event.target.value))} placeholder="1" disabled={saving} />
            </label>
            {direction === "decrease" && stock && <p className="store-visit-stock-modal-hint">Pengurangan maksimum {stock.totalStock.toLocaleString("id-ID")} pcs.</p>}
            {!stocks.length && <p className="store-visit-stock-modal-hint" role="status">Belum ada varian yang tersedia untuk toko ini.</p>}
          </div>
          <footer>
            <button className="store-visit-stock-modal-cancel" type="button" onClick={onClose} disabled={saving}>Batal</button>
            <button className="store-visit-stock-submit" type="submit" disabled={!stock || !quantity || saving}>
              <Package aria-hidden="true" /> {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
