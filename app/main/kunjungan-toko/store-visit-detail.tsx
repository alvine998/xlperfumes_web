"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Store as StoreIcon } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { getAllApiPages } from "@/lib/pagination";
import { isStore, type Store } from "@/lib/stores";

type StoreVisitDetailProps = { storeId: string; storeName: string };

export function StoreVisitDetail({ storeId, storeName }: StoreVisitDetailProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const numericStoreId = Number(storeId);
  const hasValidSelection = Number.isSafeInteger(numericStoreId) && numericStoreId > 0 && storeName.trim().length > 0;

  useEffect(() => {
    if (!hasValidSelection) return;
    let isCurrent = true;
    const params = new URLSearchParams({ store_name: storeName });
    getAllApiPages(`/stores?${params.toString()}`, "stores", isStore)
      .then((stores) => {
        if (!isCurrent) return;
        const foundStore = stores.find((item) => item.id === numericStoreId);
        if (foundStore) setStore(foundStore);
        else setError("Toko yang dipilih tidak ditemukan. Silakan pilih toko kembali.");
      })
      .catch(() => {
        if (isCurrent) setError("Informasi toko tidak dapat dimuat. Silakan coba kembali.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [hasValidSelection, numericStoreId, storeName]);

  return (
    <section className="dashboard-content store-visit-content store-visit-detail-content" aria-labelledby="store-visit-detail-title">
      <div className="dashboard-heading store-visit-heading">
        <div>
          <span className="dashboard-eyebrow">OPERASIONAL LAPANGAN · LANGKAH 02</span>
          <h1 id="store-visit-detail-title">Detail Kunjungan Toko</h1>
          <p>Informasi toko yang dipilih untuk kunjungan ini.</p>
        </div>
        <Link className="store-visit-back" href="/main/kunjungan-toko"><ArrowLeft aria-hidden="true" /> Ganti Toko</Link>
      </div>

      {!hasValidSelection ? (
        <div className="store-visit-detail-state" role="alert">
          <strong>Toko belum dipilih</strong>
          <p>Pilih toko terlebih dahulu untuk melihat detail kunjungan.</p>
          <Link className="store-visit-continue" href="/main/kunjungan-toko">Pilih Toko <ArrowLeft aria-hidden="true" /></Link>
        </div>
      ) : isLoading ? (
        <div className="store-visit-detail-state" role="status">Memuat informasi toko…</div>
      ) : error ? (
        <div className="store-visit-detail-state" role="alert">
          <strong>{error}</strong>
          <Link className="store-visit-continue" href="/main/kunjungan-toko">Pilih Toko <ArrowLeft aria-hidden="true" /></Link>
        </div>
      ) : store ? (
        <section className="store-visit-panel store-visit-detail-card" aria-labelledby="store-visit-detail-store-title">
          <header className="store-visit-panel-heading">
            <span className="store-visit-icon information-icon"><StoreIcon aria-hidden="true" /></span>
            <div>
              <span className="dashboard-eyebrow">INFORMASI TOKO</span>
              <h2 id="store-visit-detail-store-title">{store.name}</h2>
            </div>
          </header>
          <dl className="store-visit-details store-visit-detail-fields">
            <div><dt><StoreIcon aria-hidden="true" /> Cabang</dt><dd>{store.branch || "Belum terdaftar"}</dd></div>
            <div><dt><MapPin aria-hidden="true" /> Zona</dt><dd>{store.zona || "Belum ditetapkan"}</dd></div>
            <div className="address-row"><dt><MapPin aria-hidden="true" /> Alamat</dt><dd>{store.address || "Alamat belum tersedia"}</dd></div>
          </dl>
        </section>
      ) : null}

      <DashboardFooter section="DETAIL KUNJUNGAN TOKO" />
    </section>
  );
}
