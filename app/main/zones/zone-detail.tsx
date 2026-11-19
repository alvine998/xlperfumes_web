"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Route, Store as StoreIcon, UsersRound } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { api, getApi, getApiError } from "@/lib/api";
import { isStore, type Store } from "@/lib/stores";
import { isZone, isZoneCollector, type Zone, type ZoneCollector } from "@/lib/zones";
import { ZoneMembersPanel } from "./zone-members-panel";
import { ZoneRoutePanel } from "./zone-route-panel";
import { ZoneStoresPanel } from "./zone-stores-panel";

type ZoneTab = "members" | "stores" | "route";

const ZONE_TABS: { id: ZoneTab; label: string; Icon: typeof UsersRound }[] = [
  { id: "members", label: "Anggota", Icon: UsersRound },
  { id: "stores", label: "Toko", Icon: StoreIcon },
  { id: "route", label: "Rute", Icon: Route },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseZoneStoreData(value: unknown) {
  if (
    !isRecord(value) ||
    !isZone(value.zone) ||
    !Array.isArray(value.stores) ||
    !value.stores.every(isStore) ||
    !Array.isArray(value.availableStores) ||
    !value.availableStores.every(isStore)
  ) {
    throw new Error("API mengembalikan daftar toko zona yang tidak valid.");
  }
  return {
    zone: value.zone,
    stores: value.stores,
    availableStores: value.availableStores,
  };
}

type ZoneDetailProps = {
  zoneId: number;
};

export function ZoneDetail({ zoneId }: ZoneDetailProps) {
  const [zone, setZone] = useState<Zone | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [savedOrderIds, setSavedOrderIds] = useState<number[]>([]);
  const [collectors, setCollectors] = useState<ZoneCollector[]>([]);
  const [activeTab, setActiveTab] = useState<ZoneTab>("members");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [error, setError] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      getApi(`/zones/${zoneId}`),
      getApi("/zones/collectors"),
    ])
      .then(([zoneResponse, collectorsResponse]) => {
        if (!isCurrent) return;
        const zoneData = parseZoneStoreData(zoneResponse.data);
        const collectorsPayload = collectorsResponse.data;
        if (
          !isRecord(collectorsPayload) ||
          !Array.isArray(collectorsPayload.users) ||
          !collectorsPayload.users.every(isZoneCollector)
        ) {
          throw new Error("API mengembalikan daftar pengguna collecting yang tidak valid.");
        }
        setZone(zoneData.zone);
        setStores(zoneData.stores);
        setAvailableStores(zoneData.availableStores);
        setSavedOrderIds(zoneData.stores.map(({ id }) => id));
        setCollectors(collectorsPayload.users);
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setError(getApiError(cause));
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [zoneId]);

  const hasOrderChanges =
    stores.length !== savedOrderIds.length ||
    stores.some((store, index) => savedOrderIds[index] !== store.id);

  function moveStore(storeId: number, targetId: number) {
    setStores((current) => {
      const sourceIndex = current.findIndex(({ id }) => id === storeId);
      const targetIndex = current.findIndex(({ id }) => id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }
      const reordered = [...current];
      const [movedStore] = reordered.splice(sourceIndex, 1);
      if (!movedStore) return current;
      reordered.splice(targetIndex, 0, movedStore);
      return reordered.map((store, index) => ({ ...store, routeIndex: index + 1 }));
    });
  }

  function resetStoreOrder() {
    const storesById = new Map(stores.map((store) => [store.id, store]));
    const restored = savedOrderIds.flatMap((id) => {
      const store = storesById.get(id);
      return store ? [store] : [];
    });
    setStores(restored.map((store, index) => ({ ...store, routeIndex: index + 1 })));
  }

  async function addStoresToZone(storeIds: number[]) {
    if (storeIds.length === 0) return;
    setIsSavingMembership(true);
    try {
      await api.post(`/zones/${zoneId}/stores`, { storeIds });
      const { data } = await getApi(`/zones/${zoneId}`);
      const zoneData = parseZoneStoreData(data);
      setZone(zoneData.zone);
      setStores(zoneData.stores);
      setAvailableStores(zoneData.availableStores);
      setSavedOrderIds(zoneData.stores.map(({ id }) => id));
      toast.success(`${storeIds.length} toko berhasil ditambahkan ke zona.`);
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setIsSavingMembership(false);
    }
  }

  async function removeStoreFromZone(storeId: number) {
    setIsSavingMembership(true);
    try {
      await api.delete(`/zones/${zoneId}/stores/${storeId}`);
      const { data } = await getApi(`/zones/${zoneId}`);
      const zoneData = parseZoneStoreData(data);
      setZone(zoneData.zone);
      setStores(zoneData.stores);
      setAvailableStores(zoneData.availableStores);
      setSavedOrderIds(zoneData.stores.map(({ id }) => id));
      toast.success("Toko dikeluarkan dari zona.");
    } catch (cause) {
      toast.error(getApiError(cause));
    } finally {
      setIsSavingMembership(false);
    }
  }

  async function saveStoreOrder() {
    setIsSavingOrder(true);
    try {
      const { data } = await api.put<unknown>(
        `/zones/${zoneId}/stores/order`,
        { storeIds: stores.map(({ id }) => id) },
      );
      if (!isRecord(data) || !Array.isArray(data.stores) ||
        !data.stores.every(isStore)) {
        throw new Error("API mengembalikan urutan toko zona yang tidak valid.");
      }
      setStores(data.stores);
      setSavedOrderIds(data.stores.map(({ id }) => id));
      toast.success("Urutan toko berhasil disimpan.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Urutan toko tidak dapat disimpan.",
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % ZONE_TABS.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (index + ZONE_TABS.length - 1) % ZONE_TABS.length;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = ZONE_TABS[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="dashboard-content zones-content zones-detail-content">
      <section className="dashboard-heading zones-detail-heading">
        <div>
          <Link className="zones-back-link" href="/main/zones">
            <ArrowLeft size={15} aria-hidden="true" />
            Daftar Zona
          </Link>
          <span className="dashboard-eyebrow">LOKASI &amp; OPERASIONAL</span>
          <h1>{zone?.name ?? "Detail Zona"}</h1>
          <p>
            {zone
              ? `${zone.branch}${zone.picUsername ? ` · PIC ${zone.picUsername}` : ""}`
              : "Kelola anggota, toko, dan rute zona."}
          </p>
        </div>
        {zone && (
          <span className="zones-detail-summary">
            {zone.storeCount} toko <i>·</i> {zone.memberCount} anggota
          </span>
        )}
      </section>

      {error && <p className="zones-error" role="alert">{error}</p>}
      {isLoading ? (
        <div className="zones-detail-loading" role="status">Memuat detail zona…</div>
      ) : zone ? (
        <>
          <div className="zones-detail-tabs" role="tablist" aria-label="Detail zona">
            {ZONE_TABS.map(({ id, label, Icon }, index) => (
              <button
                aria-controls="zone-detail-tabpanel"
                aria-selected={activeTab === id}
                className={`zones-detail-tab${activeTab === id ? " is-active" : ""}`}
                id={`zone-tab-${id}`}
                key={id}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(element) => { tabRefs.current[index] = element; }}
                role="tab"
                tabIndex={activeTab === id ? 0 : -1}
                type="button"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
                {id === "stores" && <span>{stores.length}</span>}
              </button>
            ))}
          </div>
          <div
            aria-labelledby={`zone-tab-${activeTab}`}
            className="zones-detail-tabpanel"
            id="zone-detail-tabpanel"
            role="tabpanel"
            tabIndex={0}
          >
            {activeTab === "members" && (
              <ZoneMembersPanel
                collectors={collectors}
                zone={zone}
                onUpdated={(memberCount) => {
                  setZone((current) => current ? { ...current, memberCount } : current);
                }}
              />
            )}
            {activeTab === "stores" && (
              <ZoneStoresPanel
                availableStores={availableStores}
                stores={stores}
                hasOrderChanges={hasOrderChanges}
                isSavingOrder={isSavingOrder}
                isSavingMembership={isSavingMembership}
                onMoveStore={moveStore}
                onSaveOrder={() => void saveStoreOrder()}
                onResetOrder={resetStoreOrder}
                onAddStores={(storeIds) => void addStoresToZone(storeIds)}
                onRemoveStore={(storeId) => void removeStoreFromZone(storeId)}
              />
            )}
            {activeTab === "route" && <ZoneRoutePanel stores={stores} />}
          </div>
        </>
      ) : (
        <div className="zones-detail-empty">
          <strong>Zona tidak dapat ditampilkan</strong>
          <span>Periksa zona yang dipilih atau kembali ke daftar zona.</span>
        </div>
      )}
      <DashboardFooter section="DETAIL ZONA" />
    </div>
  );
}
