"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  Store as StoreIcon,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { api, getApi, getApiError } from "@/lib/api";
import { isStore, type Store } from "@/lib/stores";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestStore(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await api.request<unknown>({
    url: `/stores${path}`,
    method,
    data: body,
  });
  if (response.status === 204) return null;
  const payload = response.data;
  if (!isRecord(payload) || !isStore(payload.store))
    throw new Error("API mengembalikan data toko yang tidak valid.");
  return payload.store;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function StoresManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let isCurrent = true;
    getApi("/stores")
      .then(({ data }) => {
        if (!isCurrent) return;
        const payload = data;
        if (
          !isRecord(payload) ||
          !Array.isArray(payload.stores) ||
          !payload.stores.every(isStore)
        ) {
          throw new Error("API mengembalikan daftar toko yang tidak valid.");
        }
        setStores(payload.stores);
      })
      .catch((cause: unknown) => {
        if (isCurrent) setError(getApiError(cause));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    Promise.all(
      stores.map(
        async (store) =>
          [
            store.id,
            await QRCode.toDataURL(store.name, {
              errorCorrectionLevel: "M",
              margin: 1,
              width: 100,
              color: { dark: "#292820", light: "#ffffff" },
            }),
          ] as const,
      ),
    )
      .then((entries) => {
        if (isCurrent) setQrCodes(Object.fromEntries(entries));
      })
      .catch(() => {
        if (isCurrent) toast.error("QR code tidak dapat dibuat.");
      });
    return () => {
      isCurrent = false;
    };
  }, [stores]);

  const branches = useMemo(
    () =>
      [...new Set(stores.map((store) => store.branch))].sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [stores],
  );
  const filteredStores = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return stores
      .filter(
        (store) =>
          store.name.toLocaleLowerCase("id-ID").includes(query) &&
          (branchFilter === "all" || store.branch === branchFilter),
      )
      .sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [stores, search, branchFilter, sortOrder]);

  function openCreate() {
    setEditingStore(null);
    dialogRef.current?.showModal();
  }

  function openEdit(store: Store) {
    setEditingStore(store);
    dialogRef.current?.showModal();
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error("Browser ini tidak mendukung akses lokasi.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const form = dialogRef.current?.querySelector("form");
        if (form) {
          const latitude = form.elements.namedItem("latitude");
          const longitude = form.elements.namedItem("longitude");
          if (latitude instanceof HTMLInputElement)
            latitude.value = position.coords.latitude.toFixed(7);
          if (longitude instanceof HTMLInputElement)
            longitude.value = position.coords.longitude.toFixed(7);
        }
        setIsLocating(false);
        toast.success("Pin lokasi berhasil diambil.");
      },
      () => {
        setIsLocating(false);
        toast.error(
          "Lokasi tidak tersedia. Izinkan akses lokasi lalu coba lagi.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? "").trim(),
      branch: String(data.get("branch") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      latitude: Number(data.get("latitude")),
      longitude: Number(data.get("longitude")),
    };
    setIsSaving(true);
    try {
      const store = await requestStore(
        editingStore ? `/${editingStore.id}` : "",
        editingStore ? "PATCH" : "POST",
        body,
      );
      if (store)
        setStores((current) =>
          editingStore
            ? current.map((item) => (item.id === store.id ? store : item))
            : [store, ...current],
        );
      dialogRef.current?.close();
      toast.success(
        editingStore
          ? "Perubahan toko tersimpan."
          : "Toko berhasil ditambahkan.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Toko tidak dapat disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(store: Store) {
    if (
      !window.confirm(
        `Hapus toko ${store.name}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    try {
      await requestStore(`/${store.id}`, "DELETE");
      setStores((current) => current.filter((item) => item.id !== store.id));
      toast.success("Toko berhasil dihapus.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Toko tidak dapat dihapus.",
      );
    }
  }

  function exportExcel() {
    const rows = filteredStores.map((store) => ({
      "Nama Toko": store.name,
      Cabang: store.branch,
      Alamat: store.address,
      Latitude: store.latitude,
      Longitude: store.longitude,
      "Tanggal Dibuat": dateLabel(store.createdAt),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      "Daftar Toko",
    );
    XLSX.writeFile(workbook, "daftar-toko-xl-perfumes.xlsx");
  }

  function exportPdf() {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    pdf.setFontSize(16);
    pdf.text("Daftar Toko | XL Perfumes", 14, 16);
    pdf.setFontSize(9);
    let y = 26;
    const columns = [14, 57, 92, 142, 195, 240];
    pdf.setFont("helvetica", "bold");
    [
      "Nama Toko",
      "Cabang",
      "Alamat",
      "Latitude",
      "Longitude",
      "Dibuat",
    ].forEach((label, index) => pdf.text(label, columns[index] ?? 14, y));
    pdf.setFont("helvetica", "normal");
    y += 7;
    filteredStores.forEach((store) => {
      if (y > 190) {
        pdf.addPage();
        y = 18;
      }
      const wrappedAddress = pdf.splitTextToSize(store.address, 48);
      const address = Array.isArray(wrappedAddress)
        ? wrappedAddress
        : [wrappedAddress];
      pdf.text(store.name.slice(0, 26), columns[0], y);
      pdf.text(store.branch.slice(0, 20), columns[1], y);
      pdf.text(address.slice(0, 2), columns[2], y);
      pdf.text(String(store.latitude), columns[3], y);
      pdf.text(String(store.longitude), columns[4], y);
      pdf.text(dateLabel(store.createdAt), columns[5], y);
      y += Math.max(7, address.slice(0, 2).length * 4);
    });
    pdf.save("daftar-toko-xl-perfumes.pdf");
  }

  return (
    <div className="dashboard-content stores-content">
      <section
        className="dashboard-heading stores-page-heading"
        aria-labelledby="stores-title"
      >
        <div>
          <span className="dashboard-eyebrow">LOKASI &amp; CABANG</span>
          <h1 id="stores-title">Daftar Toko</h1>
          <p>Kelola informasi toko, lokasi, dan QR code setiap cabang.</p>
        </div>
        <div className="stores-heading-actions">
          <span className="report-updated">
            <span className="live-indicator" /> {stores.length} TOKO TERDAFTAR
          </span>
          <button
            className="stores-primary-button"
            type="button"
            onClick={openCreate}
          >
            <Plus size={16} aria-hidden="true" />
            Tambah toko
          </button>
        </div>
      </section>

      <section className="stores-summary" aria-label="Ringkasan toko">
        <article className="stores-summary-card">
          <span className="stores-summary-icon">
            <StoreIcon aria-hidden="true" />
          </span>
          <div>
            <span>Total toko</span>
            <strong>
              {stores.length}
              <small>toko</small>
            </strong>
          </div>
          <span className="stores-summary-note">Seluruh lokasi terdaftar</span>
        </article>
        <article className="stores-summary-card">
          <span className="stores-summary-icon stores-summary-icon-gold">
            <MapPin aria-hidden="true" />
          </span>
          <div>
            <span>Total cabang</span>
            <strong>
              {branches.length}
              <small>cabang</small>
            </strong>
          </div>
          <span className="stores-summary-note">Lokasi operasional</span>
        </article>
      </section>

      <section
        className="stores-table-section"
        aria-labelledby="stores-table-title"
      >
        <header className="stores-table-header">
          <div>
            <span className="dashboard-eyebrow">DATA OPERASIONAL</span>
            <h2 id="stores-table-title">
              Semua toko <span>{filteredStores.length}</span>
            </h2>
            <p>QR code toko dibuat otomatis dari nama toko.</p>
          </div>
          <div className="stores-toolbar">
            <label className="stores-search">
              <span className="sr-only">Cari berdasarkan nama toko</span>
              <Search aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama toko"
              />
            </label>
            <label className="stores-select">
              <span className="sr-only">Urutkan tanggal</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </label>
            <label className="stores-select">
              <span className="sr-only">Filter cabang</span>
              <select
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
              >
                <option value="all">Semua cabang</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="stores-export-button"
              type="button"
              onClick={exportPdf}
            >
              <FileText size={15} aria-hidden="true" />
              Export PDF
            </button>
            <button
              className="stores-export-button"
              type="button"
              onClick={exportExcel}
            >
              <FileSpreadsheet size={15} aria-hidden="true" />
              Export Excel
            </button>
          </div>
        </header>
        {error && (
          <p className="stores-error" role="alert">
            {error}
          </p>
        )}
        <DataTable<Store>
          ariaLabel="Daftar toko"
          className="stores-table"
          wrapperClassName="stores-table-wrap"
          stateCellClassName="stores-empty"
          columns={[
            {
              id: "qr",
              header: "QR TOKO",
              renderCell: (store) => (
                <div className="store-qr">
                  {qrCodes[store.id] ? (
                    <Image
                      src={qrCodes[store.id]}
                      width={54}
                      height={54}
                      unoptimized
                      alt={`QR code ${store.name}`}
                    />
                  ) : (
                    <span aria-label="Membuat QR code">•••</span>
                  )}
                </div>
              ),
            },
            {
              id: "name",
              header: "NAMA TOKO",
              renderCell: (store) => (
                <div className="store-name-cell">
                  <strong>{store.name}</strong>
                  <small>ID TOKO {store.id}</small>
                </div>
              ),
            },
            {
              id: "branch",
              header: "CABANG",
              renderCell: (store) => (
                <span className="store-branch">{store.branch}</span>
              ),
            },
            {
              id: "address",
              header: "ALAMAT",
              className: "store-address",
              renderCell: (store) => store.address,
            },
            {
              id: "location",
              header: "PIN LOKASI",
              renderCell: (store) => (
                <a
                  className="store-location-link"
                  href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={13} aria-hidden="true" />
                  {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
                </a>
              ),
            },
            {
              id: "created-at",
              header: "DIBUAT",
              className: "store-date",
              renderCell: (store) => dateLabel(store.createdAt),
            },
            {
              id: "actions",
              header: <span className="sr-only">Aksi</span>,
              renderCell: (store) => (
                <div className="store-row-actions">
                  <button
                    className="store-row-action"
                    type="button"
                    onClick={() => openEdit(store)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    className="store-row-action store-delete-action"
                    type="button"
                    onClick={() => void handleDelete(store)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              ),
            },
          ]}
          rows={filteredStores}
          getRowKey={(store) => store.id}
          hasError={Boolean(error)}
          isLoading={isLoading}
          loadingContent="Memuat daftar toko…"
          emptyContent={
            <>
              <span className="stores-empty-icon">
                <Search aria-hidden="true" />
              </span>
              <strong>
                {stores.length
                  ? "Tidak ada toko ditemukan"
                  : "Belum ada toko terdaftar"}
              </strong>
              <span>
                {stores.length
                  ? "Ubah kata kunci atau filter cabang."
                  : "Tambahkan toko untuk mulai mengelola lokasi."}
              </span>
            </>
          }
        />
        <footer className="stores-table-footer">
          <span>
            Menampilkan <strong>{filteredStores.length}</strong> dari{" "}
            <strong>{stores.length}</strong> toko
          </span>
          <span>
            XL Perfumes <i>·</i> Daftar toko
          </span>
        </footer>
      </section>
      <DashboardFooter section="DAFTAR TOKO" />

      <Modal
        className="stores-dialog"
        ref={dialogRef}
        aria-labelledby="store-form-title"
        onClose={() => setEditingStore(null)}
      >
        <form
          className="app-modal-panel stores-dialog-panel"
          key={editingStore?.id ?? "new-store"}
          onSubmit={handleSave}
        >
          <header className="stores-dialog-header">
            <div>
              <span className="dashboard-eyebrow">
                {editingStore ? "PERBARUI DATA" : "LOKASI BARU"}
              </span>
              <h2 id="store-form-title">
                {editingStore ? "Edit toko" : "Tambah toko"}
              </h2>
              <p>Lengkapi identitas dan pin lokasi toko.</p>
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
          <div className="stores-dialog-fields">
            <label className="stores-form-field">
              <span>Nama Toko</span>
              <input
                name="name"
                maxLength={120}
                placeholder="Contoh: XL Perfumes Blok M"
                defaultValue={editingStore?.name}
                required
              />
            </label>
            <label className="stores-form-field">
              <span>Cabang</span>
              <input
                name="branch"
                maxLength={100}
                placeholder="Contoh: Jakarta Selatan"
                defaultValue={editingStore?.branch}
                required
              />
            </label>
            <label className="stores-form-field">
              <span>Alamat</span>
              <textarea
                name="address"
                rows={3}
                placeholder="Alamat lengkap toko"
                defaultValue={editingStore?.address}
                required
              />
            </label>
            <fieldset className="stores-location-field">
              <legend>Pin Lokasi (Current Location)</legend>
              <p>Gunakan lokasi perangkat untuk mengisi koordinat toko.</p>
              <button
                className="stores-location-button"
                type="button"
                onClick={captureLocation}
                disabled={isLocating}
              >
                <MapPin size={15} aria-hidden="true" />
                {isLocating ? "Mengambil lokasi…" : "Ambil current location"}
              </button>
              <div className="stores-coordinate-grid">
                <label className="stores-form-field">
                  <span>Latitude</span>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    placeholder="-6.2000000"
                    defaultValue={editingStore?.latitude}
                    required
                  />
                </label>
                <label className="stores-form-field">
                  <span>Longitude</span>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    placeholder="106.8166667"
                    defaultValue={editingStore?.longitude}
                    required
                  />
                </label>
              </div>
            </fieldset>
          </div>
          <footer className="stores-dialog-actions">
            <button
              className="stores-secondary-button"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button
              className="stores-primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Menyimpan…"
                : editingStore
                  ? "Simpan perubahan"
                  : "Simpan toko"}
            </button>
          </footer>
          <p className="stores-dialog-note">
            <Download size={12} aria-hidden="true" /> QR code akan dibuat
            otomatis berdasarkan Nama Toko.
          </p>
        </form>
      </Modal>
    </div>
  );
}
