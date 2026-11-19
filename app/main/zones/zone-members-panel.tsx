"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi } from "@/lib/api";
import {
  isZoneUser,
  type Zone,
  type ZoneCollector,
  type ZoneUser,
} from "@/lib/zones";

type ZoneMembersPanelProps = {
  zone: Zone;
  collectors: ZoneCollector[];
  onUpdated: (memberCount: number) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function ZoneMembersPanel({
  zone,
  collectors,
  onUpdated,
}: ZoneMembersPanelProps) {
  const [zoneUsers, setZoneUsers] = useState<ZoneUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const addMemberDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let isCurrent = true;
    getApi(`/zones/${zone.id}/users`)
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.users)) {
          throw new Error(
            "API mengembalikan daftar anggota zona yang tidak valid.",
          );
        }
        const users = data.users.filter(isZoneUser);
        if (users.length !== data.users.length) {
          throw new Error(
            "API mengembalikan daftar anggota zona yang tidak valid.",
          );
        }
        setZoneUsers(users);
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        const message =
          cause instanceof Error
            ? cause.message
            : "Anggota zona tidak dapat dimuat.";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [zone.id]);

  useEffect(() => {
    const dialog = addMemberDialogRef.current;
    if (isAddDialogOpen && dialog && !dialog.open) dialog.showModal();
  }, [isAddDialogOpen]);

  const assignedIds = new Set(zoneUsers.map(({ id }) => id));
  const availableCollectors = collectors.filter(
    ({ id }) => !assignedIds.has(id),
  );
  const query = searchTerm.trim().toLocaleLowerCase();
  const filteredCollectors = availableCollectors.filter(({ username }) =>
    username.toLocaleLowerCase().includes(query),
  );

  function closeAddDialog() {
    const dialog = addMemberDialogRef.current;
    if (dialog?.open) dialog.close();
    else resetAddDialog();
  }

  function resetAddDialog() {
    setIsAddDialogOpen(false);
    setSearchTerm("");
    setSelectedUserIds([]);
  }

  function toggleUserSelection(userId: number) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function saveUsers(userIds: number[], successMessage: string) {
    setIsSaving(true);
    try {
      const { data } = await api.put<unknown>(`/zones/${zone.id}/users`, {
        userIds,
      });
      if (!isRecord(data) || !Array.isArray(data.users)) {
        throw new Error(
          "API mengembalikan daftar anggota zona yang tidak valid.",
        );
      }
      const users = data.users.filter(isZoneUser);
      if (users.length !== data.users.length) {
        throw new Error(
          "API mengembalikan daftar anggota zona yang tidak valid.",
        );
      }
      setZoneUsers(users);
      onUpdated(users.length);
      toast.success(successMessage);
      return true;
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Anggota zona tidak dapat disimpan.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddMembers() {
    const newUserIds = selectedUserIds.filter((id) => !assignedIds.has(id));
    if (newUserIds.length === 0) return;
    const saved = await saveUsers(
      [...zoneUsers.map(({ id }) => id), ...newUserIds],
      `${newUserIds.length} anggota berhasil ditambahkan ke zona.`,
    );
    if (saved) closeAddDialog();
  }

  async function handleRemoveMember(user: ZoneUser) {
    if (!window.confirm(`Keluarkan ${user.username} dari zona ini?`)) return;
    const nextUserIds = zoneUsers
      .filter(({ id }) => id !== user.id)
      .map(({ id }) => id);
    await saveUsers(nextUserIds, `${user.username} dikeluarkan dari zona.`);
  }

  return (
    <section className="zones-detail-card" aria-labelledby="zone-members-title">
      <header className="zones-detail-card-header">
        <div>
          <span className="dashboard-eyebrow">ANGGOTA ZONA</span>
          <h2 id="zone-members-title">Anggota zona</h2>
          <p>Kelola pengguna collecting yang ditugaskan ke zona ini.</p>
        </div>
        <button
          className="zones-primary-button"
          type="button"
          disabled={isLoading || isSaving || Boolean(error)}
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          Tambah Anggota
        </button>
      </header>
      {error && (
        <p className="zones-error" role="alert">
          {error}
        </p>
      )}
      <div className="zones-current-members" aria-busy={isLoading}>
        {isLoading ? (
          <p className="zones-members-state" role="status">
            Memuat anggota zona…
          </p>
        ) : zoneUsers.length === 0 ? (
          <div className="zones-members-empty">
            <strong>Belum ada anggota di zona ini</strong>
            <span>
              Tambahkan pengguna collecting untuk mulai menugaskan anggota.
            </span>
          </div>
        ) : (
          zoneUsers.map((user) => {
            const activeCollector = collectors.some(({ id }) => id === user.id);
            return (
              <div className="zones-current-member" key={user.id}>
                <span>
                  <strong>{user.username}</strong>
                  {!activeCollector && (
                    <small>Pengguna nonaktif / bukan collecting</small>
                  )}
                </span>
                <button
                  aria-label={`Keluarkan ${user.username} dari zona`}
                  className="zones-member-remove"
                  disabled={isSaving}
                  onClick={() => void handleRemoveMember(user)}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </div>
      <footer className="zones-detail-card-footer">
        <span>
          {zoneUsers.length} anggota · perubahan langsung berlaku untuk zona
          ini.
        </span>
      </footer>
      <dialog
        aria-labelledby="zone-add-members-title"
        className="zones-stores-dialog"
        onClose={resetAddDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeAddDialog();
        }}
        ref={addMemberDialogRef}
      >
        <div className="zones-stores-dialog-header">
          <div>
            <span className="dashboard-eyebrow">PENGGUNA COLLECTING</span>
            <h2 id="zone-add-members-title">Tambah Anggota</h2>
            <p>Pilih pengguna collecting yang belum menjadi anggota zona.</p>
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
          <span className="sr-only">Cari pengguna collecting</span>
          <input
            autoFocus
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari username"
            type="search"
            value={searchTerm}
          />
        </label>
        <div className="zones-stores-list" aria-live="polite">
          {availableCollectors.length === 0 ? (
            <p className="zones-members-state">
              Semua pengguna collecting sudah menjadi anggota zona ini.
            </p>
          ) : filteredCollectors.length === 0 ? (
            <p className="zones-members-state">
              Tidak ada pengguna yang cocok dengan pencarian.
            </p>
          ) : (
            filteredCollectors.map((user) => (
              <label className="zones-member-option" key={user.id}>
                <input
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  type="checkbox"
                />
                <span>
                  <strong>{user.username}</strong>
                </span>
              </label>
            ))
          )}
        </div>
        <div className="zones-dialog-actions">
          <span className="zones-stores-selection-count" role="status">
            {selectedUserIds.length} pengguna dipilih
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
            disabled={selectedUserIds.length === 0 || isSaving}
            onClick={() => void handleAddMembers()}
            type="button"
          >
            {isSaving ? "Menyimpan…" : `Tambah (${selectedUserIds.length})`}
          </button>
        </div>
      </dialog>
    </section>
  );
}
