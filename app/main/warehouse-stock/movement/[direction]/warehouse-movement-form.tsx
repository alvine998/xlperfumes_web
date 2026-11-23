"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CameraOff, ImageUp, PackagePlus, ScanLine, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";

type Direction = "in" | "out";
type Product = { id: number; variantId: number | null; variantName: string | null; barcode: string; branchId: number; branch: string; status: string };
type ScanResult = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement | ImageBitmap): Promise<ScanResult[]> };

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => Detector;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) && typeof value.id === "number" &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    (typeof value.variantName === "string" || value.variantName === null) &&
    typeof value.barcode === "string" && typeof value.branchId === "number" &&
    typeof value.branch === "string" && typeof value.status === "string";
}

export function WarehouseMovementForm({ direction }: { direction: Direction }) {
  const router = useRouter();
  const isIncoming = direction === "in";
  const expectedStatus = isIncoming ? "pending" : "di_gudang";
  const [barcode, setBarcode] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopCamera() {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function addBarcode(value = barcode) {
    const code = value.trim();
    if (!code || adding) return;
    if (items.some((item) => item.barcode === code)) {
      toast.error("Kode QR sudah ada di daftar.");
      setBarcode("");
      return;
    }
    setAdding(true);
    try {
      const { data } = await getApi(`/products?search=${encodeURIComponent(code)}`);
      if (!isRecord(data) || !Array.isArray(data.products) || !data.products.every(isProduct)) {
        throw new Error("Data produk dari API tidak valid.");
      }
      const product = data.products.find((item: Product) => item.barcode === code);
      if (!product) throw new Error("Kode QR tidak ditemukan.");
      if (product.status !== expectedStatus) {
        throw new Error(isIncoming ? "Barang ini tidak berstatus Pending." : "Barang ini tidak berstatus Di Gudang.");
      }
      setItems((current) => [...current, product]);
      setBarcode("");
      inputRef.current?.focus();
      toast.success("Barang ditambahkan ke daftar.");
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setAdding(false);
    }
  }

  async function startCamera() {
    setCameraError("");
    const BarcodeDetectorConstructor = window.BarcodeDetector;
    if (!BarcodeDetectorConstructor) {
      setCameraError("Pemindaian kamera tidak didukung di browser ini. Gunakan scanner QR atau ketik kode barcode.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });
      setCameraOn(true);
      scanTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        void detector.detect(video).then((results) => {
          const result = results.find((item) => item.rawValue.trim());
          if (result) {
            setBarcode(result.rawValue.trim());
            stopCamera();
            void addBarcode(result.rawValue);
          }
        }).catch(() => undefined);
      }, 350);
    } catch {
      stopCamera();
      setCameraError("Kamera tidak dapat dibuka. Periksa izin kamera atau masukkan kode barcode secara manual.");
    }
  }

  async function scanGalleryImage(file: File | undefined) {
    if (!file) return;
    setCameraError("");
    const BarcodeDetectorConstructor = window.BarcodeDetector;
    if (!BarcodeDetectorConstructor) {
      setCameraError("Pembacaan QR dari gambar tidak didukung di browser ini. Gunakan scanner kamera atau masukkan kode barcode secara manual.");
      return;
    }
    setGalleryLoading(true);
    let image: ImageBitmap | null = null;
    try {
      image = await createImageBitmap(file);
      const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });
      const results = await detector.detect(image);
      const result = results.find((item) => item.rawValue.trim());
      if (!result) {
        setCameraError("QR Code tidak ditemukan di gambar yang dipilih.");
        return;
      }
      setBarcode(result.rawValue.trim());
      await addBarcode(result.rawValue);
    } catch {
      setCameraError("Gambar tidak dapat dibaca. Pilih gambar QR Code yang lebih jelas.");
    } finally {
      image?.close();
      setGalleryLoading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function submit() {
    if (!items.length || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<unknown>("/products/warehouse-movement", {
        direction,
        barcodes: items.map((item) => item.barcode),
      });
      if (!isRecord(data) || !Array.isArray(data.products) || !data.products.every(isProduct)) {
        throw new Error("Data hasil pergerakan barang tidak valid.");
      }
      toast.success(`${items.length} barang berhasil diproses.`);
      router.push("/main/warehouse-stock");
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-content warehouse-stock-content">
      <section className="dashboard-heading warehouse-stock-heading movement-heading" aria-labelledby="movement-title">
        <div>
          <span className="dashboard-eyebrow">INVENTARIS GUDANG</span>
          <h1 id="movement-title">Barang {isIncoming ? "Masuk" : "Keluar"}</h1>
          <p>{isIncoming ? "Pindai barang yang akan diterima ke gudang." : "Pindai barang yang akan keluar dari gudang."}</p>
        </div>
        <Link className="store-stock-back-link" href="/main/warehouse-stock"><ArrowLeft aria-hidden="true" /> Kembali ke Stok Gudang</Link>
      </section>

      <section className="warehouse-stock-panel movement-panel" aria-labelledby="movement-list-title">
        <header className="warehouse-stock-panel-header movement-panel-header">
          <div><span className="dashboard-eyebrow">PEMINDAIAN BARANG</span><h2 id="movement-list-title">Daftar Barang {isIncoming ? "Masuk" : "Keluar"} <span>{items.length}</span></h2><p>Scan QR dengan kamera atau masukkan Kode QR, lalu tekan Enter.</p></div>
          <div className="warehouse-scan-source-actions">
            <button className="warehouse-stock-action incoming" type="button" onClick={() => cameraOn ? stopCamera() : void startCamera()}>
              {cameraOn ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}{cameraOn ? "Matikan Kamera" : "Scan QR Code"}
            </button>
            <input className="warehouse-gallery-input" ref={galleryInputRef} type="file" accept="image/*" aria-label="Pilih gambar QR Code dari galeri" onChange={(event) => void scanGalleryImage(event.target.files?.[0])} />
            <button className="warehouse-stock-action gallery" type="button" onClick={() => galleryInputRef.current?.click()} disabled={galleryLoading || adding}>
              <ImageUp aria-hidden="true" />{galleryLoading ? "Membaca QR…" : "Pilih dari Galeri"}
            </button>
          </div>
        </header>
        <div className="warehouse-scan-controls">
          <label htmlFor="warehouse-barcode-input">Kode QR</label>
          <form onSubmit={(event) => { event.preventDefault(); void addBarcode(); }}>
            <span className="warehouse-scan-input"><ScanLine aria-hidden="true" /><input id="warehouse-barcode-input" ref={inputRef} autoComplete="off" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan atau ketik kode barcode" /></span>
            <button className="warehouse-scan-add" type="submit" disabled={!barcode.trim() || adding}>{adding ? "Memeriksa…" : "Tambah ke Daftar"}</button>
          </form>
          <video className={`warehouse-camera-preview${cameraOn ? " is-active" : ""}`} ref={videoRef} muted playsInline aria-label="Pratinjau kamera untuk scan QR" />
          {cameraError && <p className="warehouse-camera-error" role="alert">{cameraError}</p>}
        </div>
        <div className="warehouse-stock-table-wrap">
          <table className="warehouse-stock-table movement-table">
            <thead><tr><th>Kode Barcode</th><th>Varian</th><th>Aksi</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td className="warehouse-stock-state" colSpan={3}>Belum ada barang di daftar.</td></tr> : items.map((item) => (
                <tr key={item.barcode}><td className="warehouse-movement-barcode">{item.barcode}</td><td><strong className="warehouse-stock-name">{item.variantName ?? "Varian belum dipetakan"}</strong><small className="warehouse-movement-branch">{item.branch}</small></td><td><button className="warehouse-remove-item" type="button" aria-label={`${isIncoming ? "Hapus" : "Hapus dari daftar"} ${item.variantName ?? "produk"} ${item.barcode}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.barcode !== item.barcode))}><Trash2 aria-hidden="true" /> {isIncoming ? "Hapus" : "Hapus dari daftar"}</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="warehouse-movement-footer"><span>Total <strong>{items.length}</strong> barang</span><button className="warehouse-stock-action incoming" type="button" onClick={() => void submit()} disabled={items.length === 0 || submitting}><PackagePlus aria-hidden="true" />{submitting ? "Menyimpan…" : `Submit Barang ${isIncoming ? "Masuk" : "Keluar"}`}</button></footer>
      </section>
    </div>
  );
}
