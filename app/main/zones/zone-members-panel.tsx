"use client";

import { useEffect, useState } from "react";
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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getApi(`/zones/${zone.id}/users`)
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.users)) {
          throw new Error("API mengembalikan daftar anggota zona yang tidak valid.");
        }
        const users = data.users.filter(isZoneUser);
        if (users.length !== data.users.length) {
          throw new Error("API mengembalikan daftar anggota zona yang tidak valid.");
        }
        setZoneUsers(users);
        setSelectedUserIds(users.map(({ id }) => id));
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        const message = cause instanceof Error
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

  function toggleUser(userId: number) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { data } = await api.put<unknown>(
        `/zones/${zone.id}/users`,
        { userIds: selectedUserIds },
      );
      if (!isRecord(data) || !Array.isArray(data.users)) {
        throw new Error("API mengembalikan daftar anggota zona yang tidak valid.");
      }
      const users = data.users.filter(isZoneUser);
      if (users.length !== data.users.length) {
        throw new Error("API mengembalikan daftar anggota zona yang tidak valid.");
      }
      setZoneUsers(users);
      onUpdated(users.length);
      toast.success("Anggota zona berhasil diperbarui.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Anggota zona tidak dapat disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const allUsers = [
    ...collectors,
    ...zoneUsers
      .filter((user) => !collectors.some(({ id }) => id === user.id))
      .map(({ id, username }) => ({ id, username })),
  ];

  return (
    <section className="zones-detail-card" aria-labelledby="zone-members-title">
      <header className="zones-detail-card-header">
        <div>
          <span className="dashboard-eyebrow">ANGGOTA ZONA</span>
          <h2 id="zone-members-title">Kelola anggota</h2>
          <p>Pilih pengguna collecting yang ditugaskan ke zona ini.</p>
        </div>
        <span className="zones-detail-count">{zone.memberCount} anggota</span>
      </header>
      <div className="zones-members-list" aria-busy={isLoading}>
        {error && <p className="zones-error" role="alert">{error}</p>}
        {isLoading ? (
          <p className="zones-members-state" role="status">Memuat anggota zona…</p>
        ) : allUsers.length === 0 ? (
          <p className="zones-members-state">Belum ada pengguna collecting aktif.</p>
        ) : (
          allUsers.map((user) => {
            const inactive = !collectors.some(({ id }) => id === user.id);
            return (
              <label className="zones-member-option" key={user.id}>
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                <span>
                  <strong>{user.username}</strong>
                  {inactive && <small>Pengguna nonaktif / bukan collecting</small>}
                </span>
              </label>
            );
          })
        )}
      </div>
      <footer className="zones-detail-card-footer">
        <span>Perubahan anggota akan berlaku untuk zona ini.</span>
        <button
          className="zones-primary-button"
          type="button"
          disabled={isLoading || isSaving || Boolean(error)}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Menyimpan…" : "Simpan anggota"}
        </button>
      </footer>
    </section>
  );
}
