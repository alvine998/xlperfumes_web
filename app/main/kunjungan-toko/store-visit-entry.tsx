"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CameraOff, ImageUp, MapPin, QrCode, Search, Store as StoreIcon } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { createQRCodeDetector } from "@/lib/barcode-detector";
import { api, getApi, getApiError } from "@/lib/api";
import { isApiPagination } from "@/lib/pagination";
import { isStore, type Store } from "@/lib/stores";
import { useDebounce } from "@/hooks/use-debounce";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sameName(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), "id", { sensitivity: "base" }) === 0;
}

export function StoreVisitEntry({ targetStoreId = null, targetStoreName = "" }: { targetStoreId?: number | null; targetStoreName?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [targetScanVerified, setTargetScanVerified] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInProgressRef = useRef(false);
  const searchQueryRef = useRef("");
  const debouncedQuery = useDebounce(query.trim());

  useEffect(() => () => {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!debouncedQuery || (targetStoreId !== null && !targetScanVerified)) return;
    let isCurrent = true;
    const params = new URLSearchParams({ store_name: debouncedQuery, page: "1", limit: "100" });

    getApi(`/stores?${params.toString()}`)
      .then(({ data }) => {
        if (!isCurrent || searchQueryRef.current !== debouncedQuery) return;
        if (!isRecord(data) || !Array.isArray(data.stores) || !data.stores.every(isStore) ||
          !isApiPagination(data.pagination)) {
          throw new Error("Data toko dari API tidak valid.");
        }

        const matches = data.stores;
        const exactMatches = matches.filter((store) => sameName(store.name, debouncedQuery));
        const expectedStore = targetStoreId === null
          ? null
          : exactMatches.find((store) => store.id === targetStoreId) ?? null;
        setStores(matches);
        setSelectedStore(targetStoreId !== null
          ? expectedStore
          : exactMatches.length === 1 ? exactMatches[0] ?? null : null);
        if (targetStoreId !== null && !expectedStore) {
          setSearchError("QR Code tidak cocok dengan toko tujuan atau toko ini tidak termasuk zona Anda.");
          return;
        }
        setSearchError("");
      })
      .catch((cause: unknown) => {
        if (!isCurrent || searchQueryRef.current !== debouncedQuery) return;
        setStores([]);
        setSelectedStore(null);
        setSearchError(getApiError(cause));
      })
      .finally(() => {
        if (isCurrent && searchQueryRef.current === debouncedQuery) setIsSearching(false);
      });

    return () => { isCurrent = false; };
  }, [debouncedQuery, targetScanVerified, targetStoreId]);

  function stopCamera() {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function handleStoreName(value: string, scannedForTarget = false) {
    setTargetScanVerified(targetStoreId !== null && scannedForTarget);
    searchQueryRef.current = value.trim();
    setQuery(value);
    setStores([]);
    setSelectedStore(null);
    setSearchError("");
    setIsSearching(Boolean(value.trim()));
  }

  function handleScannedValue(value: string) {
    const storeName = value.trim();
    if (!storeName) {
      setCameraError("QR Code tidak berisi nama toko.");
      return;
    }
    if (targetStoreId !== null && !sameName(storeName, targetStoreName)) {
      setSelectedStore(null);
      setTargetScanVerified(false);
      setCameraError(`QR Code ini bukan toko tujuan. Scan QR ${targetStoreName} di lokasi toko tersebut.`);
      return;
    }
    setCameraError("");
    handleStoreName(storeName, true);
  }

  async function startCamera() {
    setCameraError("");
    const detector = createQRCodeDetector();
    if (!detector) {
      setCameraError(targetStoreId !== null
        ? "Pemindaian QR belum didukung di browser ini. Gunakan browser yang mendukung kamera untuk scan di lokasi toko."
        : "Pemindaian QR belum didukung di browser ini. Masukkan nama toko atau pilih QR dari galeri.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
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
        void detector.detect(video)
          .then((results) => {
            const result = results.find((item) => item.rawValue.trim());
            if (!result) return;
            stopCamera();
            handleScannedValue(result.rawValue);
          })
          .catch(() => undefined)
          .finally(() => { scanInProgressRef.current = false; });
      }, 350);
    } catch {
      stopCamera();
      setCameraError(targetStoreId !== null
        ? "Kamera tidak dapat dibuka. Izinkan akses kamera untuk scan QR di lokasi toko."
        : "Kamera tidak dapat dibuka. Periksa izin kamera atau masukkan nama toko secara manual.");
    }
  }

  async function scanGalleryImage(file: File | undefined) {
    if (!file) return;
    setCameraError("");
    const detector = createQRCodeDetector();
    if (!detector) {
      setCameraError(targetStoreId !== null
        ? "Pembacaan QR dari gambar belum didukung di browser ini. Scan QR toko menggunakan kamera."
        : "Pembacaan QR dari gambar belum didukung di browser ini. Masukkan nama toko secara manual.");
      return;
    }

    setGalleryLoading(true);
    let image: ImageBitmap | null = null;
    try {
      image = await createImageBitmap(file);
      const results = await detector.detect(image);
      const result = results.find((item) => item.rawValue.trim());
      if (!result) {
        setCameraError("QR Code tidak ditemukan. Pilih gambar QR toko yang lebih jelas.");
        return;
      }
      handleScannedValue(result.rawValue);
    } catch {
      setCameraError("Gambar tidak dapat dibaca. Pilih gambar QR toko yang lebih jelas.");
    } finally {
      image?.close();
      setGalleryLoading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function continueToVisit() {
    if (!selectedStore || (targetStoreId !== null && !targetScanVerified)) return;
    setIsCheckingIn(true);
    setCheckInError("");
    try {
      await api.post(`/stores/${selectedStore.id}/visit/check-in`);
    } catch (cause: unknown) {
      setCheckInError(getApiError(cause));
      setIsCheckingIn(false);
      return;
    }
    const params = new URLSearchParams({
      storeId: String(selectedStore.id),
      storeName: selectedStore.name,
    });
    router.push(`/main/kunjungan-toko/detail?${params.toString()}`);
    setIsCheckingIn(false);
  }

  const shownStores = stores.slice(0, 8);

  return (
    <section className="dashboard-content store-visit-content" aria-labelledby="store-visit-title">
      <div className="dashboard-heading store-visit-heading">
        <div>
          <span className="dashboard-eyebrow">OPERASIONAL LAPANGAN</span>
          <h1 id="store-visit-title">Kunjungan Toko</h1>
          <p>{targetStoreId !== null
            ? `Scan QR ${targetStoreName} di lokasi toko untuk mencatat kehadiran dan membuka kunjungan.`
            : "Temukan toko yang akan dikunjungi dengan QR Code atau nama toko."}</p>
        </div>
        <div className="store-visit-step" aria-label="Langkah 1 dari 2">
          <span className="is-current"><b>01</b> Pilih Toko</span>
          <span className="store-visit-step-line" aria-hidden="true" />
          <span><b>02</b> Detail Kunjungan</span>
        </div>
      </div>

      <div className="store-visit-columns">
        <section className="store-visit-panel store-visit-scanner" aria-labelledby="store-visit-scanner-title">
          <header className="store-visit-panel-heading">
            <span className="store-visit-icon scanner-icon"><QrCode aria-hidden="true" /></span>
            <div>
              <span className="dashboard-eyebrow">CARI TOKO</span>
              <h2 id="store-visit-scanner-title">QR Code Scanner</h2>
            </div>
          </header>

          <div className={`store-visit-camera${cameraOn ? " is-active" : ""}`}>
            <video ref={videoRef} className="store-visit-video" aria-label="Pratinjau kamera QR toko" playsInline muted hidden={!cameraOn} />
            {!cameraOn && (
              <div className="store-visit-camera-empty">
                <span><QrCode aria-hidden="true" /></span>
              <strong>{targetStoreId !== null ? `Scan QR ${targetStoreName} di toko` : "Arahkan QR Code toko ke kamera"}</strong>
                <small>Pastikan nama toko terlihat jelas pada label QR.</small>
              </div>
            )}
          </div>

          <div className="store-visit-scan-actions">
            <button className={`store-visit-button ${cameraOn ? "camera-stop" : "camera-start"}`} type="button" onClick={() => cameraOn ? stopCamera() : void startCamera()}>
              {cameraOn ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
              {cameraOn ? "Matikan Kamera" : "Scan QR Code"}
            </button>
            {targetStoreId === null && <input
              className="store-visit-gallery-input"
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              aria-label="Pilih gambar QR toko dari galeri"
              onChange={(event) => void scanGalleryImage(event.target.files?.[0])}
            />}
            {targetStoreId === null && <button className="store-visit-button gallery-button" type="button" onClick={() => galleryInputRef.current?.click()} disabled={galleryLoading}>
              <ImageUp aria-hidden="true" />
              {galleryLoading ? "Membaca QR…" : "Pilih dari Galeri"}
            </button>}
          </div>

          {cameraError && <p className="store-visit-error" role="alert">{cameraError}</p>}

          {targetStoreId === null && <>
          <div className="store-visit-divider"><span>ATAU CARI MANUAL</span></div>
          <label className="store-visit-search-label" htmlFor="store-visit-search">Nama Toko</label>
          <div className="store-visit-search-box">
            <Search aria-hidden="true" />
            <input
              id="store-visit-search"
              type="search"
              value={query}
              onChange={(event) => handleStoreName(event.target.value)}
              placeholder="Ketik nama toko…"
              autoComplete="off"
              aria-describedby="store-visit-search-help"
            />
          </div>
          <p className="store-visit-search-help" id="store-visit-search-help">Pilih toko dari hasil pencarian yang muncul.</p>
          </>}

          {isSearching && <p className="store-visit-search-state" role="status">Mencari toko…</p>}
          {searchError && <p className="store-visit-error" role="alert">{searchError}</p>}
          {!isSearching && !searchError && query.trim() && stores.length === 0 && !selectedStore && debouncedQuery === query.trim() && (
            <p className="store-visit-error" role="alert">Toko tidak ditemukan atau berada di luar zona yang ditugaskan. Periksa nama toko atau hubungi admin untuk memeriksa penugasan zona.</p>
          )}
          {shownStores.length > 0 && !selectedStore && (
            <ul className="store-visit-results" aria-label="Hasil pencarian toko">
              {shownStores.map((store) => (
                <li key={store.id}>
                  <button type="button" onClick={() => setSelectedStore(store)} aria-pressed={false}>
                    <span className="store-visit-result-icon"><StoreIcon aria-hidden="true" /></span>
                    <span className="store-visit-result-copy"><strong>{store.name}</strong><small>{store.branch}{store.zona ? ` · ${store.zona}` : ""}</small></span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                </li>
              ))}
              {stores.length > shownStores.length && <li className="store-visit-result-more">Menampilkan 8 toko pertama. Perjelas nama toko untuk mempersempit hasil.</li>}
            </ul>
          )}
        </section>

        <section className="store-visit-panel store-visit-information" aria-labelledby="store-visit-information-title">
          <header className="store-visit-panel-heading">
            <span className="store-visit-icon information-icon"><StoreIcon aria-hidden="true" /></span>
            <div>
              <span className="dashboard-eyebrow">TOKO TERPILIH</span>
              <h2 id="store-visit-information-title">Information Toko</h2>
            </div>
          </header>

          {selectedStore ? (
            <div className="store-visit-selected" aria-live="polite">
              <span className="store-visit-selected-label"><span /> TOKO SIAP DIKUNJUNGI</span>
              <h3>{selectedStore.name}</h3>
              <dl className="store-visit-details">
                <div><dt><StoreIcon aria-hidden="true" /> Cabang</dt><dd>{selectedStore.branch || "Belum terdaftar"}</dd></div>
                <div><dt><MapPin aria-hidden="true" /> Zona</dt><dd>{selectedStore.zona || "Belum ditetapkan"}</dd></div>
                <div className="address-row"><dt><MapPin aria-hidden="true" /> Alamat</dt><dd>{selectedStore.address || "Alamat belum tersedia"}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="store-visit-information-empty" role="status">
              <span><StoreIcon aria-hidden="true" /></span>
              <strong>{targetStoreId !== null ? "Menunggu scan QR toko" : "Belum ada toko dipilih"}</strong>
              <p>{targetStoreId !== null
                ? `Scan QR ${targetStoreName} di lokasi toko ini untuk memastikan Anda sudah tiba.`
                : "Scan QR, pilih gambar QR dari galeri, atau cari nama toko. Informasi toko akan tampil di sini."}</p>
            </div>
          )}

          <div className="store-visit-information-footer">
            <p>{selectedStore
              ? targetStoreId !== null ? "QR toko tujuan berhasil dipindai. Lanjutkan untuk mencatat kunjungan dan membuka detail." : "Lanjutkan untuk mencatat kunjungan dan membuka detail toko."
              : targetStoreId !== null ? "Kunjungan hanya dapat dimulai setelah QR toko tujuan dipindai di lokasi." : "Pilih satu toko untuk membuka detail kunjungan."}</p>
            {checkInError && <p className="store-visit-error" role="alert">Kunjungan gagal dicatat: {checkInError}</p>}
            <button className="store-visit-continue" type="button" onClick={() => void continueToVisit()} disabled={!selectedStore || (targetStoreId !== null && !targetScanVerified) || isCheckingIn}>
              {isCheckingIn ? "Mencatat kunjungan…" : "Lanjutkan"} <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <DashboardFooter section="KUNJUNGAN TOKO" />
    </section>
  );
}
