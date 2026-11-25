"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, CameraOff, PackagePlus, ScanLine, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiError } from "@/lib/api";
import { createQRCodeDetector } from "@/lib/barcode-detector";

type VisitProduct = {
  id: number;
  barcode: string;
  storeId: number | null;
  variantId: number | null;
  variantName: string | null;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVisitProduct(value: unknown): value is VisitProduct {
  return isRecord(value) && typeof value.id === "number" &&
    typeof value.barcode === "string" &&
    (typeof value.storeId === "number" || value.storeId === null) &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.status === "string";
}

export function StoreVisitReceiveModal({
  storeId,
  onClose,
  onReceived,
}: {
  storeId: number;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [pendingBarcodes, setPendingBarcodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInProgressRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, submitting]);

  function stopCamera() {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    scanInProgressRef.current = false;
    setCameraOn(false);
  }

  function addBarcode(value = barcode) {
    const code = value.trim();
    if (!code || submitting) return;
    if (pendingBarcodes.includes(code)) {
      toast.error("Kode QR sudah ada di daftar.");
      setBarcode("");
      return;
    }
    if (pendingBarcodes.length >= 500) {
      toast.error("Maksimal 500 produk dapat dimasukkan dalam satu kali proses.");
      return;
    }
    setPendingBarcodes((current) => [...current, code]);
    setBarcode("");
    inputRef.current?.focus();
  }

  async function startCamera() {
    setCameraError("");
    const detector = createQRCodeDetector();
    if (!detector) {
      setCameraError("Pemindaian kamera tidak didukung. Gunakan scanner QR atau ketik kode barcode.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || scanInProgressRef.current) return;
        scanInProgressRef.current = true;
        void detector.detect(video).then((results) => {
          const result = results.find((item) => item.rawValue.trim());
          if (result) {
            stopCamera();
            addBarcode(result.rawValue);
          }
        }).catch(() => undefined).finally(() => {
          scanInProgressRef.current = false;
        });
      }, 350);
    } catch {
      stopCamera();
      setCameraError("Kamera tidak dapat dibuka. Periksa izin kamera atau masukkan kode barcode secara manual.");
    }
  }

  async function submitProducts() {
    if (!pendingBarcodes.length || submitting) return;
    stopCamera();
    setSubmitting(true);
    let succeeded = false;
    try {
      const { data } = await api.post<unknown>(`/store-stock/${storeId}/visit/receive`, {
        barcodes: pendingBarcodes,
      });
      if (!isRecord(data) || !Array.isArray(data.products) || !data.products.every(isVisitProduct)) {
        throw new Error("Data produk yang dimasukkan tidak valid.");
      }
      toast.success(`${pendingBarcodes.length} produk berhasil dimasukkan ke toko.`);
      succeeded = true;
      onReceived();
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      if (!succeeded) setSubmitting(false);
    }
  }

  return typeof document === "undefined" ? null : createPortal(
    <div className="store-visit-stock-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section className="store-visit-stock-modal" role="dialog" aria-modal="true" aria-labelledby="visit-receive-modal-title" aria-describedby="visit-receive-modal-description">
        <header>
          <div><span className="dashboard-eyebrow">KUNJUNGAN TOKO</span><h2 id="visit-receive-modal-title">Masukkan Barang ke Toko</h2><p id="visit-receive-modal-description">Pindai produk berstatus Di Collecting untuk memindahkannya ke toko ini.</p></div>
          <button type="button" className="store-visit-stock-modal-close" onClick={onClose} disabled={submitting} aria-label="Tutup modal"><X aria-hidden="true" /></button>
        </header>
        <div className="store-visit-stock-modal-body">
          <div className="store-visit-stock-modal-tools">
            <button className="store-visit-stock-scan-button" type="button" onClick={() => cameraOn ? stopCamera() : void startCamera()} disabled={submitting}>
              {cameraOn ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
              {cameraOn ? "Matikan Kamera" : "Scan QR dengan Kamera"}
            </button>
            <span>Gunakan kamera, scanner QR, atau ketik kode secara manual.</span>
          </div>
          <form className="store-visit-stock-scan-form" onSubmit={(event) => { event.preventDefault(); addBarcode(); }}>
            <label htmlFor={`visit-stock-barcode-${storeId}`}>Kode QR Produk</label>
            <div>
              <span className="store-visit-stock-scan-input"><ScanLine aria-hidden="true" /><input id={`visit-stock-barcode-${storeId}`} ref={inputRef} autoComplete="off" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan atau ketik kode barcode" /></span>
              <button type="submit" disabled={!barcode.trim() || submitting}>Tambah ke Daftar</button>
            </div>
          </form>
          <video className={`store-visit-stock-camera${cameraOn ? " is-active" : ""}`} ref={videoRef} muted playsInline aria-label="Pratinjau kamera untuk scan QR produk" />
          {cameraError && <p className="store-visit-stock-camera-error" role="alert">{cameraError}</p>}
          <div className="store-visit-stock-pending-heading"><strong>Produk siap dimasukkan</strong><span>{pendingBarcodes.length} produk</span></div>
          <ul className="store-visit-stock-pending-list">
            {pendingBarcodes.length === 0 ? <li className="is-empty">Belum ada produk di daftar.</li>
              : pendingBarcodes.map((code) => <li key={code}><code>{code}</code><button type="button" aria-label={`Hapus ${code} dari daftar`} onClick={() => setPendingBarcodes((current) => current.filter((item) => item !== code))}><Trash2 aria-hidden="true" /> Hapus</button></li>)}
          </ul>
        </div>
        <footer>
          <button className="store-visit-stock-modal-cancel" type="button" onClick={onClose} disabled={submitting}>Tutup</button>
          <button className="store-visit-stock-submit" type="button" onClick={() => void submitProducts()} disabled={!pendingBarcodes.length || submitting}>
            <PackagePlus aria-hidden="true" /> {submitting ? "Menyimpan…" : `Masukkan ${pendingBarcodes.length} Barang`}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
