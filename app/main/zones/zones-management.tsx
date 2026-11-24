"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Layers, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DataTable } from "@/components/ui/data-table";
import { ApiPagination } from "@/components/ui/api-pagination";
import { Modal } from "@/components/ui/modal";
import { useDebounce } from "@/hooks/use-debounce";
import { api, getApi, getApiError } from "@/lib/api";
import { isBranch, type Branch } from "@/lib/branches";
import { getAllApiPages, isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";
import {
  isZone,
  isZoneCollector,
  type Zone,
  type ZoneCollector,
} from "@/lib/zones";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestZone(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await api.request<unknown>({
    url: `/zones${path}`,
    method,
    data: body,
  });
  if (response.status === 204) return null;

  const payload = response.data;
  if (!isRecord(payload) || !isZone(payload.zone)) {
    throw new Error("API mengembalikan data zona yang tidak valid.");
  }
  return payload.zone;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function ZonesManagement() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [collectors, setCollectors] = useState<ZoneCollector[]>([]);
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  const requestQuery = params.toString();
  const requestKey = `${requestQuery}|reload=${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;
  const error = (requestError?.key === requestKey ? requestError.message : "") || lookupError;

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      getAllApiPages("/branches", "branches", isBranch),
      getAllApiPages("/zones/collectors", "users", isZoneCollector),
    ])
      .then(([branchRows, collectorRows]) => {
        if (!isCurrent) return;
        setBranches(branchRows);
        setCollectors(collectorRows);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setLookupError(getApiError(cause));
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    getApi(`/zones?${requestQuery}`)
      .then(({ data: zonePayload }) => {
        if (!isCurrent) return;
        if (!isRecord(zonePayload) || !Array.isArray(zonePayload.zones) ||
          !zonePayload.zones.every(isZone) || !isApiPagination(zonePayload.pagination)) {
          throw new Error("API mengembalikan daftar zona yang tidak valid.");
        }
        setZones(zonePayload.zones);
        setPagination(zonePayload.pagination);
        setPage(Math.min(page, Math.max(1, zonePayload.pagination.totalPages)));
        setRequestError(null);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setRequestError({ key: requestKey, message: getApiError(cause) });
      })
      .finally(() => {
        if (isCurrent) setLoadedRequestKey(requestKey);
      });
    return () => {
      isCurrent = false;
    };
  }, [requestQuery, requestKey, page]);

  function openCreate() {
    setEditingZone(null);
    dialogRef.current?.querySelector("form")?.reset();
    dialogRef.current?.showModal();
  }

  function openEdit(zone: Zone) {
    setEditingZone(zone);
    dialogRef.current?.showModal();
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") ?? "").trim(),
      branchId: Number(formData.get("branchId")),
      userPicId: String(formData.get("userPicId") ?? "")
        ? Number(formData.get("userPicId"))
        : null,
    };
    setIsSaving(true);
    try {
      const zone = await requestZone(
        editingZone ? `/${editingZone.id}` : "",
        editingZone ? "PATCH" : "POST",
        body,
      );
      if (zone) setReloadKey((current) => current + 1);
      dialogRef.current?.close();
      toast.success(
        editingZone ? "Perubahan zona tersimpan." : "Zona berhasil ditambahkan.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Zona tidak dapat disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(zone: Zone) {
    if (zone.storeCount > 0) {
      toast.error("Zona tidak dapat dihapus karena masih digunakan oleh toko.");
      return;
    }
    if (!window.confirm(`Hapus zona ${zone.name}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await requestZone(`/${zone.id}`, "DELETE");
      setReloadKey((current) => current + 1);
      toast.success("Zona berhasil dihapus.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Zona tidak dapat dihapus.",
      );
    }
  }

  return (
    <div className="dashboard-content zones-content">
      <section
        className="dashboard-heading zones-page-heading"
        aria-labelledby="zones-title"
      >
        <div>
          <span className="dashboard-eyebrow">LOKASI &amp; OPERASIONAL</span>
          <h1 id="zones-title">Daftar Zona</h1>
          <p>Kelola zona operasional dan cabang terkait XL Perfumes.</p>
        </div>
        <button
          className="zones-primary-button"
          type="button"
          onClick={openCreate}
        >
          <Plus size={16} aria-hidden="true" />
          Tambah zona
        </button>
      </section>

      <section className="zones-table-section" aria-labelledby="zones-table-title">
        <header className="zones-table-header">
          <div>
            <span className="dashboard-eyebrow">DATA OPERASIONAL</span>
            <h2 id="zones-table-title">
              Semua zona <span>{pagination.total}</span>
            </h2>
            <p>Zona yang digunakan oleh toko tidak dapat diubah atau dihapus.</p>
          </div>
          <label className="zones-search">
            <span className="sr-only">Cari nama zona, cabang, atau pembuat</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setPage(1); setSearch(event.target.value); }}
              placeholder="Cari zona"
            />
          </label>
        </header>
        {error && <p className="zones-error" role="alert">{error}</p>}
        <DataTable<Zone>
          ariaLabel="Daftar zona"
          className="zones-table"
          wrapperClassName="zones-table-wrap"
          stateCellClassName="zones-empty"
          columns={[
            {
              id: "name",
              header: "NAMA ZONA",
              renderCell: (zone) => (
                <strong className="zones-name">{zone.name}</strong>
              ),
            },
            { id: "branch", header: "CABANG", renderCell: (zone) => zone.branch },
            {
              id: "created-by",
              header: "DIBUAT OLEH",
              renderCell: (zone) => zone.createdBy ?? "—",
            },
            {
              id: "pic",
              header: "PIC",
              renderCell: (zone) => zone.picUsername ?? "—",
            },
            {
              id: "created-at",
              header: "DIBUAT PADA",
              className: "zones-date",
              renderCell: (zone) => dateLabel(zone.createdAt),
            },
            {
              id: "actions",
              header: "AKSI",
              className: "zones-actions-cell",
              renderCell: (zone) => {
                const isUsed = zone.storeCount > 0;
                const usageTitle = isUsed
                  ? `Digunakan oleh ${zone.storeCount} toko`
                  : undefined;
                return (
                  <div className="zones-row-actions">
                    <Link
                      className="zones-row-action"
                      href={`/main/zones/${zone.id}`}
                      aria-label={`Buka detail zona ${zone.name}`}
                    >
                      <ArrowRight size={14} aria-hidden="true" />
                      Detail
                    </Link>
                    <button
                      className="zones-row-action"
                      type="button"
                      aria-label={
                        isUsed
                          ? `${zone.name} digunakan oleh ${zone.storeCount} toko dan tidak dapat diubah`
                          : `Edit zona ${zone.name}`
                      }
                      title={usageTitle}
                      disabled={isUsed}
                      onClick={() => openEdit(zone)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      className="zones-row-action zones-delete-action"
                      type="button"
                      aria-label={
                        isUsed
                          ? `${zone.name} digunakan oleh ${zone.storeCount} toko dan tidak dapat dihapus`
                          : `Hapus zona ${zone.name}`
                      }
                      title={usageTitle}
                      disabled={isUsed}
                      onClick={() => void handleDelete(zone)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                );
              },
            },
          ]}
          rows={zones}
          getRowKey={(zone) => zone.id}
          hasError={Boolean(error)}
          isLoading={isLoading}
          loadingContent="Memuat daftar zona…"
          emptyContent={
            <>
              <span className="zones-empty-icon"><Layers aria-hidden="true" /></span>
              <strong>
                {search ? "Tidak ada zona ditemukan" : "Belum ada zona"}
              </strong>
              <span>
                {search
                  ? "Coba ubah kata kunci pencarian."
                  : "Tambahkan zona untuk mulai mengelola area operasional."}
              </span>
            </>
          }
        />
        <ApiPagination
          page={pagination.page}
          limit={pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="zona"
          isLoading={isLoading}
          onPageChange={setPage}
          onLimitChange={(limit) => { setPage(1); setPageSize(limit); }}
        />
        <footer className="zones-table-footer">
          <span>
            Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
          </span>
          <span>XL Perfumes <i>·</i> Daftar zona</span>
        </footer>
      </section>
      <DashboardFooter section="DAFTAR ZONA" />

      <Modal
        className="zones-dialog"
        ref={dialogRef}
        aria-labelledby="zone-form-title"
        onClose={() => {
          setEditingZone(null);
          dialogRef.current?.querySelector("form")?.reset();
        }}
      >
        <form
          className="app-modal-panel zones-dialog-panel"
          key={editingZone?.id ?? "new-zone"}
          onSubmit={handleSave}
        >
          <header className="zones-dialog-header">
            <div>
              <span className="dashboard-eyebrow">
                {editingZone ? "PERBARUI DATA" : "ZONA BARU"}
              </span>
              <h2 id="zone-form-title">
                {editingZone ? "Edit zona" : "Tambah zona"}
              </h2>
              <p>Lengkapi nama zona dan cabang yang terkait.</p>
            </div>
            <button
              className="notification-close"
              type="button"
              aria-label="Tutup formulir"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          <div className="zones-dialog-fields">
            <label className="zones-form-field">
              <span>Nama Zona</span>
              <input
                name="name"
                maxLength={120}
                placeholder="Contoh: Zona Jakarta Selatan"
                defaultValue={editingZone?.name}
                required
              />
            </label>
            <label className="zones-form-field">
              <span>Cabang</span>
              <select
                name="branchId"
                defaultValue={editingZone?.branchId ?? ""}
                required
              >
                <option value="">Pilih cabang</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} — {branch.city}
                  </option>
                ))}
              </select>
            </label>
            <label className="zones-form-field">
              <span>PIC (Pengguna Collecting Aktif)</span>
              <select
                name="userPicId"
                defaultValue={editingZone?.userPicId ?? ""}
              >
                <option value="">Pilih PIC (opsional)</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.username}
                  </option>
                ))}
                {editingZone?.picUsername &&
                  !collectors.some(({ id }) => id === editingZone.userPicId) && (
                  <option value={editingZone.userPicId ?? ""}>
                    {editingZone.picUsername} (nonaktif)
                  </option>
                )}
              </select>
            </label>
          </div>
          <footer className="zones-dialog-actions">
            <button
              className="zones-secondary-button"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button
              className="zones-primary-button"
              type="submit"
              disabled={isSaving || branches.length === 0}
              title={branches.length === 0 ? "Tambahkan cabang terlebih dahulu" : undefined}
            >
              {isSaving
                ? "Menyimpan…"
                : editingZone
                  ? "Simpan perubahan"
                  : "Simpan zona"}
            </button>
          </footer>
        </form>
      </Modal>

    </div>
  );
}
