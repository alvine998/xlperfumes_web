"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ClipboardCheck, GripVertical, LocateFixed, MapPin, Navigation, Store as StoreIcon } from "lucide-react";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { getApi, getApiError } from "@/lib/api";
import { isStore, type Store } from "@/lib/stores";
import { ZoneOsmMap } from "../zones/zone-osm-map";

type Location = { latitude: number; longitude: number };
type StoreActivityFlag = { username: string | null; at: string } | null;
type RouteStore = Store & { visitFlag: StoreActivityFlag; itemUpdateFlag: StoreActivityFlag };
type AssignedZone = { id: number; name: string; branch: string | null; stores: RouteStore[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssignedZone(value: unknown): value is AssignedZone {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string" &&
    (typeof value.branch === "string" || value.branch === null) &&
    Array.isArray(value.stores) && value.stores.every((store) => isRecord(store) && isStore(store) &&
      "visitFlag" in store && "itemUpdateFlag" in store &&
      isActivityFlag(store.visitFlag) && isActivityFlag(store.itemUpdateFlag));
}

function isActivityFlag(value: unknown): value is StoreActivityFlag {
  return value === null || (isRecord(value) &&
    (typeof value.username === "string" || value.username === null) && typeof value.at === "string");
}

function distanceKm(from: Location, to: Location) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.latitude - from.latitude);
  const lngDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsDirectionsUrl(origin: Location | null, destination: Store) {
  const params = new URLSearchParams({ api: "1", destination: `${destination.latitude},${destination.longitude}`, travelmode: "driving" });
  if (origin) params.set("origin", `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function RoutePlanner() {
  const searchParams = useSearchParams();
  const requestedZoneId = searchParams.get("zoneId");
  const [zones, setZones] = useState<AssignedZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [manualOrderByZone, setManualOrderByZone] = useState<Record<number, number[]>>({});
  const [draggedStoreId, setDraggedStoreId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getApi("/zones/my")
      .then(({ data }) => {
        if (!isRecord(data) || !Array.isArray(data.zones) || !data.zones.every(isAssignedZone)) {
          throw new Error("Data zona toko tidak valid.");
        }
        if (!active) return;
        setZones(data.zones);
        const requested = Number(requestedZoneId);
        const selected = data.zones.find((zone) => zone.id === requested) ?? data.zones[0];
        setSelectedZoneId(selected?.id ?? null);
        setError("");
      })
      .catch((cause: unknown) => { if (active) setError(getApiError(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedZoneId]);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const orderedStores = useMemo(() => {
    const remaining = [...(selectedZone?.stores ?? [])];
    const manualOrder = selectedZone ? manualOrderByZone[selectedZone.id] : undefined;
    if (manualOrder) {
      const byId = new Map(remaining.map((store) => [store.id, store]));
      const ordered = manualOrder.flatMap((id) => {
        const store = byId.get(id);
        if (!store) return [];
        byId.delete(id);
        return [store];
      });
      return [...ordered, ...byId.values()];
    }
    if (!currentLocation) return remaining.sort((a, b) => (a.routeIndex ?? 0) - (b.routeIndex ?? 0));
    const route: RouteStore[] = [];
    let origin = currentLocation;
    while (remaining.length) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((store, index) => {
        const distance = distanceKm(origin, store);
        if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
      });
      const [next] = remaining.splice(nearestIndex, 1);
      if (!next) break;
      route.push(next);
      origin = next;
    }
    return route;
  }, [currentLocation, manualOrderByZone, selectedZone]);

  function moveStore(fromIndex: number, toIndex: number) {
    if (!selectedZone || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= orderedStores.length) return;
    const next = [...orderedStores];
    const [store] = next.splice(fromIndex, 1);
    if (!store) return;
    next.splice(toIndex, 0, store);
    setManualOrderByZone((previous) => ({ ...previous, [selectedZone.id]: next.map(({ id }) => id) }));
  }

  function moveDraggedStore(targetId: number) {
    if (draggedStoreId === null || draggedStoreId === targetId) return;
    const fromIndex = orderedStores.findIndex(({ id }) => id === draggedStoreId);
    const toIndex = orderedStores.findIndex(({ id }) => id === targetId);
    if (fromIndex >= 0 && toIndex >= 0) moveStore(fromIndex, toIndex);
  }

  function allowLocationAndReroute() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Browser ini tidak mendukung akses lokasi. Rute toko tetap ditampilkan sesuai urutan zona.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError("Lokasi tidak tersedia. Izinkan akses lokasi di browser lalu coba lagi.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <section className="dashboard-content route-planner-content" aria-labelledby="route-planner-title">
      <div className="dashboard-heading route-planner-heading">
        <div>
          <span className="dashboard-eyebrow">OPERASIONAL LAPANGAN · COLLECTING / SPG</span>
          <h1 id="route-planner-title">Rute Toko</h1>
          <p>Atur urutan toko dengan menyeretnya. Rute peta akan mengikuti urutan pilihan Anda.</p>
        </div>
        <button className="route-location-button" type="button" onClick={allowLocationAndReroute} disabled={locating || loading}>
          <LocateFixed aria-hidden="true" />
          {locating ? "Mengambil lokasi…" : currentLocation ? "Perbarui dari Lokasi Saya" : "Izinkan Lokasi & Susun Rute"}
        </button>
      </div>

      {error && <p className="route-planner-error" role="alert">Rute toko gagal dimuat: {error}</p>}
      {locationError && <p className="route-planner-error" role="alert">{locationError}</p>}
      {loading && <p className="route-planner-state" role="status">Memuat zona tugas Anda…</p>}
      {!loading && !error && zones.length === 0 && <p className="route-planner-empty" role="status">Belum ada zona toko yang ditugaskan kepada Anda. Hubungi admin untuk mengatur zona.</p>}

      {!loading && selectedZone && (
        <>
          <section className="route-zone-picker" aria-label="Pilih zona toko">
            {zones.map((zone) => <button
              className={`route-zone-option${selectedZone.id === zone.id ? " is-active" : ""}`}
              key={zone.id}
              type="button"
              onClick={() => setSelectedZoneId(zone.id)}
              aria-pressed={selectedZone.id === zone.id}
            >
              <span><strong>{zone.name}</strong><small>{zone.branch ?? "Cabang"}</small></span>
              <b>{zone.stores.length} toko</b>
            </button>)}
          </section>

          <section className="route-zone-card" aria-labelledby="route-zone-title">
            <header className="route-zone-heading">
              <div><span className="dashboard-eyebrow">URUTAN PERJALANAN</span><h2 id="route-zone-title">{selectedZone.name}</h2><p>{selectedZone.branch ?? "Cabang"} · {orderedStores.length} toko dalam rute</p></div>
              {currentLocation && <span className="route-start-badge"><MapPin aria-hidden="true" /> Mulai dari lokasi Anda</span>}
            </header>
            {orderedStores.length ? <>
              <ZoneOsmMap stores={orderedStores} startLocation={currentLocation} />
              <ol className="route-stop-list" aria-label={`Urutan rute toko ${selectedZone.name}`}>
                {orderedStores.map((store, index) => {
                  const origin = index === 0 ? currentLocation : orderedStores[index - 1];
                  return <li key={store.id} data-store-id={store.id} className={draggedStoreId === store.id ? "is-dragging" : undefined}>
                    <button
                      className="route-stop-drag-handle"
                      type="button"
                      aria-label={`Seret ${store.name} untuk mengubah urutan`}
                      title="Seret untuk mengubah urutan"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDraggedStoreId(store.id);
                      }}
                      onPointerMove={(event) => {
                        if (draggedStoreId === null) return;
                        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-store-id]");
                        const targetId = Number(target?.dataset.storeId);
                        if (Number.isFinite(targetId)) moveDraggedStore(targetId);
                      }}
                      onPointerUp={() => setDraggedStoreId(null)}
                      onPointerCancel={() => setDraggedStoreId(null)}
                    ><GripVertical aria-hidden="true" /></button>
                    <span className="route-stop-number">{index + 1}</span>
                    <span className="route-stop-copy"><strong>{store.name}</strong><small>{store.address || store.branch}</small>
                      <span className="route-stop-flags">
                        <small className={`route-stop-flag${store.visitFlag ? " is-recorded" : ""}`}>
                          {store.visitFlag ? `Dikunjungi ${store.visitFlag.username ?? "pengguna"} · ${new Date(store.visitFlag.at).toLocaleString("id-ID")}` : "Belum ada kunjungan tercatat"}
                        </small>
                        <small className={`route-stop-flag${store.itemUpdateFlag ? " is-recorded" : ""}`}>
                          {store.itemUpdateFlag ? `Barang diperbarui ${store.itemUpdateFlag.username ?? "pengguna"} · ${new Date(store.itemUpdateFlag.at).toLocaleString("id-ID")}` : "Belum ada update barang tercatat"}
                        </small>
                      </span>
                    </span>
                    {origin && <span className="route-stop-distance">{distanceKm(origin, store).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km</span>}
                    <span className="route-stop-order-actions">
                      <button type="button" aria-label={`Pindahkan ${store.name} ke atas`} onClick={() => moveStore(index, index - 1)} disabled={index === 0}><ArrowUp aria-hidden="true" /></button>
                      <button type="button" aria-label={`Pindahkan ${store.name} ke bawah`} onClick={() => moveStore(index, index + 1)} disabled={index === orderedStores.length - 1}><ArrowDown aria-hidden="true" /></button>
                    </span>
                    <span className="route-stop-actions">
                      <a href={mapsDirectionsUrl(origin ?? null, store)} target="_blank" rel="noreferrer" aria-label={`Navigasi ke ${store.name}`}>
                        <Navigation aria-hidden="true" /> Navigasi
                      </a>
                      <Link className="route-visit-link" href={{ pathname: "/main/kunjungan-toko", query: { storeId: store.id, storeName: store.name } }} aria-label={`Kunjungi ${store.name}`}>
                        <ClipboardCheck aria-hidden="true" /> Kunjungi
                      </Link>
                    </span>
                  </li>;
                })}
              </ol>
            </> : <p className="route-planner-empty"><StoreIcon aria-hidden="true" /> Belum ada toko yang dimasukkan ke zona ini.</p>}
          </section>
        </>
      )}
      <DashboardFooter section="RUTE TOKO" />
    </section>
  );
}
