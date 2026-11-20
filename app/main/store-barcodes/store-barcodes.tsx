"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, ChevronLeft, ChevronRight, Printer, Search } from "lucide-react";
import QRCode from "qrcode";
import { getApi, getApiError } from "@/lib/api";
import { isStore, type Store } from "@/lib/stores";

type PaperSize = "A4" | "A3";
type PrintMode = "normal" | "cutting";
type Pagination = { page: number; limit: number; total: number; totalPages: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

export function StoreBarcodes() {
  const [stores, setStores] = useState<Store[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [storeName, setStoreName] = useState("");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [printMode, setPrintMode] = useState<PrintMode>("normal");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(pagination.page), limit: "50" });
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (storeName.trim()) params.set("store_name", storeName.trim());
    getApi(`/stores?${params.toString()}`)
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.stores) || !data.stores.every(isStore) || !isRecord(data.pagination)) {
          throw new Error("API mengembalikan data barcode toko yang tidak valid.");
        }
        const page = data.pagination.page;
        const limit = data.pagination.limit;
        const total = data.pagination.total;
        const totalPages = data.pagination.totalPages;
        if (typeof page !== "number" || typeof limit !== "number" || typeof total !== "number" || typeof totalPages !== "number") {
          throw new Error("Informasi halaman toko tidak valid.");
        }
        if (!active) return;
        setStores(data.stores);
        setPagination((current) => ({ ...current, page, limit, total, totalPages }));
      })
      .catch((cause: unknown) => { if (active) setError(getApiError(cause)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [pagination.page, startDate, endDate, storeName]);

  useEffect(() => {
    let active = true;
    Promise.all(stores.map(async (store) => [store.id, await QRCode.toDataURL(store.name, {
      errorCorrectionLevel: "M", margin: 1, width: 180,
      color: { dark: "#20221b", light: "#ffffff" },
    })] as const)).then((entries) => {
      if (active) setQrCodes(Object.fromEntries(entries));
    }).catch(() => { if (active) setError("QR Code tidak dapat dibuat."); });
    return () => { active = false; };
  }, [stores]);

  function handlePrint() {
    const style = document.createElement("style");
    style.id = "store-barcode-print-page";
    style.textContent = `@page { size: ${paperSize} portrait; margin: 10mm; }`;
    document.head.append(style);
    document.documentElement.dataset.barcodeMode = printMode;
    document.documentElement.dataset.barcodePaper = paperSize;
    window.addEventListener("afterprint", () => {
      style.remove();
      delete document.documentElement.dataset.barcodeMode;
      delete document.documentElement.dataset.barcodePaper;
    }, { once: true });
    window.print();
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setIsLoading(true);
    setError("");
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function changePage(page: number) {
    setIsLoading(true);
    setError("");
    setPagination((current) => ({ ...current, page }));
  }

  return (
    <section className="dashboard-content store-barcodes-content" aria-labelledby="store-barcodes-title">
      <div className="dashboard-heading store-barcodes-heading">
        <div><span className="dashboard-eyebrow">OPERASIONAL TOKO</span><h1 id="store-barcodes-title">Cetak Barcode Toko</h1><p>QR Code toko, siap dicetak dan dipotong sesuai kebutuhan.</p></div>
        <button className="store-barcodes-print-button" type="button" onClick={handlePrint} disabled={isLoading || Boolean(error) || stores.length === 0 || Object.keys(qrCodes).length !== stores.length}>
          <Printer aria-hidden="true" /> Cetak Sekarang
        </button>
      </div>

      <section className="store-barcodes-panel" aria-label="Daftar barcode toko">
        <header className="store-barcodes-controls">
          <div className="store-barcodes-filters">
            <label className="store-barcodes-control"><span>Dari tanggal</span><span className="store-barcodes-input"><CalendarDays aria-hidden="true" /><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => changeFilter(setStartDate, event.target.value)} /></span></label>
            <label className="store-barcodes-control"><span>Sampai tanggal</span><span className="store-barcodes-input"><CalendarDays aria-hidden="true" /><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => changeFilter(setEndDate, event.target.value)} /></span></label>
            <label className="store-barcodes-control"><span>Ukuran Kertas</span><select value={paperSize} onChange={(event) => setPaperSize(event.target.value as PaperSize)}><option value="A4">A4</option><option value="A3">A3</option></select></label>
            <label className="store-barcodes-control"><span>Mode Cetak</span><select value={printMode} onChange={(event) => setPrintMode(event.target.value as PrintMode)}><option value="normal">Mode Normal</option><option value="cutting">Mode Cutting</option></select></label>
          </div>
          <label className="store-barcodes-search"><Search aria-hidden="true" /><span className="sr-only">Nama Toko</span><input type="search" placeholder="Nama Toko" value={storeName} onChange={(event) => changeFilter(setStoreName, event.target.value)} /></label>
        </header>

        {isLoading ? <div className="store-barcodes-state">Memuat daftar toko…</div>
          : error ? <div className="store-barcodes-state" role="alert">{error}</div>
            : stores.length === 0 ? <div className="store-barcodes-state">Tidak ada toko untuk filter ini.</div>
              : <div className="store-barcodes-grid">{stores.map((store) => <article className="store-barcode-card" key={store.id}>
                {qrCodes[store.id] ? <Image src={qrCodes[store.id]} alt={`QR Code ${store.name}`} width={180} height={180} unoptimized /> : <div className="store-barcode-qr-loading">Membuat QR…</div>}
                <div className="store-barcode-details"><h2>{store.name}</h2><p>ID Toko: <strong>{store.id}</strong></p><small>Terdaftar pada {dateLabel(store.createdAt)}</small></div>
              </article>)}</div>}

        <footer className="store-barcodes-pagination">
          <span>Menampilkan <strong>{stores.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–{(pagination.page - 1) * pagination.limit + stores.length}</strong> dari <strong>{pagination.total}</strong> toko</span>
          <div><button type="button" aria-label="Halaman sebelumnya" disabled={pagination.page <= 1 || isLoading} onClick={() => changePage(pagination.page - 1)}><ChevronLeft aria-hidden="true" /></button><span>Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}</span><button type="button" aria-label="Halaman berikutnya" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => changePage(pagination.page + 1)}><ChevronRight aria-hidden="true" /></button></div>
        </footer>
      </section>
    </section>
  );
}
