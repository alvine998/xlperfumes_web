"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { DragEvent } from "react";
import type { Store } from "@/lib/stores";

type ZoneStoresPanelProps = {
  stores: Store[];
  availableStores: Store[];
  hasOrderChanges: boolean;
  isSavingOrder: boolean;
  isSavingMembership: boolean;
  onMoveStore: (storeId: number, targetId: number) => void;
  onSaveOrder: () => void;
  onResetOrder: () => void;
  onAddStores: (storeIds: number[]) => void;
  onRemoveStore: (storeId: number) => void;
};

export function ZoneStoresPanel({
  stores,
  availableStores,
  hasOrderChanges,
  isSavingOrder,
  isSavingMembership,
  onMoveStore,
  onSaveOrder,
  onResetOrder,
  onAddStores,
  onRemoveStore,
}: ZoneStoresPanelProps) {
  const [draggedStoreId, setDraggedStoreId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const addStoreDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = addStoreDialogRef.current;
    if (isAddDialogOpen && dialog && !dialog.open) dialog.showModal();
  }, [isAddDialogOpen]);

  const filteredAvailableStores = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return availableStores.filter((store) =>
      store.name.toLocaleLowerCase().includes(query),
    );
  }, [availableStores, searchTerm]);

  function closeAddDialog() {
    const dialog = addStoreDialogRef.current;
    if (dialog?.open) {
      dialog.close();
    } else {
      resetAddDialog();
    }
  }

  function resetAddDialog() {
    setIsAddDialogOpen(false);
    setSearchTerm("");
    setSelectedStoreIds([]);
  }

  function toggleStoreSelection(storeId: number) {
    setSelectedStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId],
    );
  }

  function handleAddStores() {
    if (selectedStoreIds.length === 0) return;
    const storeIds = [...selectedStoreIds];
    closeAddDialog();
    onAddStores(storeIds);
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, targetId: number) {
    event.preventDefault();
    const storeId = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(storeId) && storeId > 0) onMoveStore(storeId, targetId);
    setDraggedStoreId(null);
  }

  return (
    <section className="zones-detail-card" aria-labelledby="zone-stores-title">
      <header className="zones-detail-card-header">
        <div>
          <span className="dashboard-eyebrow">TOKO DALAM ZONA</span>
          <h2 id="zone-stores-title">Kelola dan urutkan toko</h2>
          <p>
            Hanya toko pada cabang zona ini yang dapat ditambahkan. Urutan toko
            digunakan sebagai urutan rute.
          </p>
        </div>
        <button
          className="zones-primary-button"
          type="button"
          disabled={isSavingMembership || isSavingOrder || hasOrderChanges}
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          Tambah Toko
        </button>
      </header>
      {stores.length === 0 ? (
        <div className="zones-detail-empty">
          <strong>Belum ada toko di zona ini</strong>
          <span>Gunakan tombol “Tambah Toko” untuk memilih toko dari cabang zona ini.</span>
        </div>
      ) : (
        <ol className="zones-store-order-list" aria-label="Urutan toko zona">
          {stores.map((store, index) => {
            const previousStore = stores[index - 1];
            const nextStore = stores[index + 1];
            return (
              <li
                className={`zones-store-order-item${draggedStoreId === store.id ? " is-dragged" : ""}`}
                key={store.id}
                draggable={!isSavingOrder && !isSavingMembership}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(store.id));
                  setDraggedStoreId(store.id);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, store.id)}
                onDragEnd={() => setDraggedStoreId(null)}
              >
                <span className="zones-store-drag-handle" aria-hidden="true">
                  <GripVertical size={17} />
                </span>
                <span className="zones-store-order-number">{index + 1}</span>
                <span className="zones-store-order-details">
                  <strong>{store.name}</strong>
                  <small>{store.address}</small>
                </span>
                <span className="zones-store-order-controls">
                  <button
                    className="zones-order-button"
                    type="button"
                    aria-label={`Pindahkan ${store.name} ke atas`}
                    disabled={!previousStore || isSavingMembership}
                    onClick={() => {
                      if (previousStore) onMoveStore(store.id, previousStore.id);
                    }}
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="zones-order-button"
                    type="button"
                    aria-label={`Pindahkan ${store.name} ke bawah`}
                    disabled={!nextStore || isSavingMembership}
                    onClick={() => {
                      if (nextStore) onMoveStore(store.id, nextStore.id);
                    }}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="zones-order-button zones-remove-store-button"
                    type="button"
                    aria-label={`Keluarkan ${store.name} dari zona`}
                    disabled={isSavingMembership || isSavingOrder || hasOrderChanges}
                    onClick={() => {
                      if (window.confirm(
                        `Keluarkan ${store.name} dari zona ini? Data toko tetap tersimpan.`,
                      )) {
                        onRemoveStore(store.id);
                      }
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <footer className="zones-detail-card-footer">
        <span>{stores.length} toko · urutan ini digunakan sebagai titik rute.</span>
        <div className="zones-order-actions">
          <button
            className="zones-secondary-button"
            type="button"
            disabled={!hasOrderChanges || isSavingOrder || isSavingMembership}
            onClick={onResetOrder}
          >
            Batalkan
          </button>
          <button
            className="zones-primary-button"
            type="button"
            disabled={!hasOrderChanges || isSavingOrder || isSavingMembership}
            onClick={onSaveOrder}
          >
            {isSavingOrder ? "Menyimpan…" : "Simpan urutan"}
          </button>
        </div>
      </footer>
      <dialog
        aria-labelledby="zone-add-stores-title"
        className="zones-stores-dialog"
        onClose={resetAddDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeAddDialog();
        }}
        ref={addStoreDialogRef}
      >
        <div className="zones-stores-dialog-header">
          <div>
            <span className="dashboard-eyebrow">TOKO CABANG ZONA</span>
            <h2 id="zone-add-stores-title">Tambah Toko</h2>
            <p>Pilih satu atau beberapa toko untuk ditambahkan ke zona.</p>
          </div>
          <button
            aria-label="Tutup"
            className="zones-stores-dialog-close"
            onClick={closeAddDialog}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <label className="zones-search zones-stores-search">
          <Search aria-hidden="true" />
          <input
            autoFocus
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari nama toko"
            type="search"
            value={searchTerm}
          />
        </label>
        <div className="zones-stores-list" aria-live="polite">
          {availableStores.length === 0 ? (
            <p className="zones-members-state">
              Tidak ada toko lain yang tersedia di cabang zona ini.
            </p>
          ) : filteredAvailableStores.length === 0 ? (
            <p className="zones-members-state">
              Tidak ada toko yang cocok dengan pencarian.
            </p>
          ) : (
            filteredAvailableStores.map((store) => (
              <label className="zones-member-option" key={store.id}>
                <input
                  checked={selectedStoreIds.includes(store.id)}
                  onChange={() => toggleStoreSelection(store.id)}
                  type="checkbox"
                />
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.address}</small>
                </span>
              </label>
            ))
          )}
        </div>
        <div className="zones-dialog-actions">
          <span className="zones-stores-selection-count" role="status">
            {selectedStoreIds.length} toko dipilih
          </span>
          <button
            className="zones-secondary-button"
            onClick={closeAddDialog}
            type="button"
          >
            Batal
          </button>
          <button
            className="zones-primary-button"
            disabled={
              selectedStoreIds.length === 0 ||
              isSavingMembership ||
              isSavingOrder ||
              hasOrderChanges
            }
            onClick={handleAddStores}
            type="button"
          >
            {isSavingMembership ? "Menyimpan…" : `Tambah (${selectedStoreIds.length})`}
          </button>
        </div>
      </dialog>
    </section>
  );
}
