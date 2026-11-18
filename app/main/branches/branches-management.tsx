"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { api, getApi, getApiError } from "@/lib/api";
import { isBranch, type Branch } from "@/lib/branches";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestBranch(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await api.request<unknown>({
    url: `/branches${path}`,
    method,
    data: body,
  });
  if (response.status === 204) return null;

  const payload = response.data;
  if (!isRecord(payload) || !isBranch(payload.branch)) {
    throw new Error("API mengembalikan data cabang yang tidak valid.");
  }
  return payload.branch;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function BranchesManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let isCurrent = true;
    getApi("/branches")
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.branches) ||
          !data.branches.every(isBranch)) {
          throw new Error("API mengembalikan daftar cabang yang tidak valid.");
        }
        setBranches(data.branches);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setError(getApiError(cause));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return branches.filter((branch) =>
      [branch.name, branch.city, branch.address].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(query),
      ),
    );
  }, [branches, search]);

  function openCreate() {
    setEditingBranch(null);
    dialogRef.current?.querySelector("form")?.reset();
    dialogRef.current?.showModal();
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    dialogRef.current?.showModal();
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
    };
    setIsSaving(true);
    try {
      const branch = await requestBranch(
        editingBranch ? `/${editingBranch.id}` : "",
        editingBranch ? "PATCH" : "POST",
        body,
      );
      if (branch) {
        setBranches((current) =>
          editingBranch
            ? current.map((item) =>
              item.id === branch.id
                ? { ...branch, storeCount: item.storeCount }
                : item,
            )
            : [branch, ...current],
        );
      }
      dialogRef.current?.close();
      toast.success(
        editingBranch ? "Perubahan cabang tersimpan." : "Cabang berhasil ditambahkan.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Cabang tidak dapat disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(branch: Branch) {
    if (branch.storeCount > 0) {
      toast.error("Cabang tidak dapat dihapus karena masih digunakan oleh toko.");
      return;
    }
    if (!window.confirm(`Hapus cabang ${branch.name}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await requestBranch(`/${branch.id}`, "DELETE");
      setBranches((current) => current.filter((item) => item.id !== branch.id));
      toast.success("Cabang berhasil dihapus.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Cabang tidak dapat dihapus.",
      );
    }
  }

  return (
    <div className="dashboard-content branches-content">
      <section
        className="dashboard-heading branches-page-heading"
        aria-labelledby="branches-title"
      >
        <div>
          <span className="dashboard-eyebrow">LOKASI &amp; OPERASIONAL</span>
          <h1 id="branches-title">Daftar Cabang</h1>
          <p>Kelola nama, kota, dan alamat setiap cabang XL Perfumes.</p>
        </div>
        <button
          className="branches-primary-button"
          type="button"
          onClick={openCreate}
        >
          <Plus size={16} aria-hidden="true" />
          Tambah cabang
        </button>
      </section>

      <section className="branches-table-section" aria-labelledby="branches-table-title">
        <header className="branches-table-header">
          <div>
            <span className="dashboard-eyebrow">DATA OPERASIONAL</span>
            <h2 id="branches-table-title">
              Semua cabang <span>{filteredBranches.length}</span>
            </h2>
            <p>Cabang yang masih digunakan oleh toko tidak dapat dihapus.</p>
          </div>
          <label className="branches-search">
            <span className="sr-only">Cari nama, kota, atau alamat cabang</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari cabang"
            />
          </label>
        </header>
        {error && <p className="branches-error" role="alert">{error}</p>}
        <DataTable<Branch>
          ariaLabel="Daftar cabang"
          className="branches-table"
          wrapperClassName="branches-table-wrap"
          stateCellClassName="branches-empty"
          columns={[
            {
              id: "number",
              header: "NO",
              className: "branches-number",
              renderCell: (branch) => filteredBranches.indexOf(branch) + 1,
            },
            {
              id: "name",
              header: "NAMA CABANG",
              renderCell: (branch) => (
                <strong className="branches-name">{branch.name}</strong>
              ),
            },
            { id: "city", header: "KOTA", renderCell: (branch) => branch.city },
            {
              id: "address",
              header: "ALAMAT",
              className: "branches-address",
              renderCell: (branch) => branch.address,
            },
            {
              id: "created-by",
              header: "DIBUAT OLEH",
              renderCell: (branch) => branch.createdBy ?? "—",
            },
            {
              id: "created-at",
              header: "DIBUAT PADA",
              className: "branches-date",
              renderCell: (branch) => dateLabel(branch.createdAt),
            },
            {
              id: "actions",
              header: "AKSI",
              className: "branches-actions-cell",
              renderCell: (branch) => (
                <div className="branches-row-actions">
                  <button
                    className="branches-row-action"
                    type="button"
                    aria-label={`Edit cabang ${branch.name}`}
                    onClick={() => openEdit(branch)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    className="branches-row-action branches-delete-action"
                    type="button"
                    aria-label={
                      branch.storeCount > 0
                        ? `${branch.name} digunakan oleh ${branch.storeCount} toko dan tidak dapat dihapus`
                        : `Hapus cabang ${branch.name}`
                    }
                    title={
                      branch.storeCount > 0
                        ? `Digunakan oleh ${branch.storeCount} toko`
                        : undefined
                    }
                    disabled={branch.storeCount > 0}
                    onClick={() => void handleDelete(branch)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              ),
            },
          ]}
          rows={filteredBranches}
          getRowKey={(branch) => branch.id}
          hasError={Boolean(error)}
          isLoading={isLoading}
          loadingContent="Memuat daftar cabang…"
          emptyContent={
            <>
              <span className="branches-empty-icon"><MapPin aria-hidden="true" /></span>
              <strong>
                {branches.length ? "Tidak ada cabang ditemukan" : "Belum ada cabang"}
              </strong>
              <span>
                {branches.length
                  ? "Coba ubah kata kunci pencarian."
                  : "Tambahkan cabang untuk mulai mengelola lokasi."}
              </span>
            </>
          }
        />
        <footer className="branches-table-footer">
          <span>
            Menampilkan <strong>{filteredBranches.length}</strong> dari{" "}
            <strong>{branches.length}</strong> cabang
          </span>
          <span>XL Perfumes <i>·</i> Daftar cabang</span>
        </footer>
      </section>
      <DashboardFooter section="DAFTAR CABANG" />

      <Modal
        className="branches-dialog"
        ref={dialogRef}
        aria-labelledby="branch-form-title"
        onClose={() => {
          setEditingBranch(null);
          dialogRef.current?.querySelector("form")?.reset();
        }}
      >
        <form
          className="app-modal-panel branches-dialog-panel"
          key={editingBranch?.id ?? "new-branch"}
          onSubmit={handleSave}
        >
          <header className="branches-dialog-header">
            <div>
              <span className="dashboard-eyebrow">
                {editingBranch ? "PERBARUI DATA" : "LOKASI BARU"}
              </span>
              <h2 id="branch-form-title">
                {editingBranch ? "Edit cabang" : "Tambah cabang"}
              </h2>
              <p>Lengkapi nama, kota, dan alamat cabang.</p>
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
          <div className="branches-dialog-fields">
            <label className="branches-form-field">
              <span>Nama Cabang</span>
              <input
                name="name"
                maxLength={120}
                placeholder="Contoh: Jakarta Selatan"
                defaultValue={editingBranch?.name}
                required
              />
            </label>
            <label className="branches-form-field">
              <span>Kota</span>
              <input
                name="city"
                maxLength={100}
                placeholder="Contoh: Jakarta"
                defaultValue={editingBranch?.city}
                required
              />
            </label>
            <label className="branches-form-field">
              <span>Alamat</span>
              <textarea
                name="address"
                rows={3}
                placeholder="Alamat lengkap cabang"
                defaultValue={editingBranch?.address}
                required
              />
            </label>
          </div>
          <footer className="branches-dialog-actions">
            <button
              className="branches-secondary-button"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button
              className="branches-primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Menyimpan…"
                : editingBranch
                  ? "Simpan perubahan"
                  : "Simpan cabang"}
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
