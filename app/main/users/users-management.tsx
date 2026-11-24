"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Plus,
  Pencil,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { ApiPagination } from "@/components/ui/api-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getApi, getApiError, api } from "@/lib/api";
import { isUser, USER_ROLES, type User, type UserRole } from "@/lib/users";
import { isApiPagination, type ApiPagination as ApiPaginationState } from "@/lib/pagination";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestUser(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await api.request<unknown>({
    url: `/users${path}`,
    method,
    data: body,
  });
  if (response.status === 204) return null;

  const payload = response.data;
  if (!isRecord(payload) || !isUser(payload.user)) {
    throw new Error("The API returned an invalid user record.");
  }
  return payload.user;
}

function roleLabel(role: UserRole) {
  if (role === "spg") return "SPG";
  return role.charAt(0).toLocaleUpperCase("id-ID") + role.slice(1);
}

function roleClass(role: UserRole) {
  return role === "collecting" ? "collect" : role;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<ApiPaginationState>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ totalUsers: 0, activeUsers: 0, adminUsers: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (roleFilter !== "all") params.set("role", roleFilter);
  if (statusFilter !== "all") params.set("isActive", String(statusFilter === "active"));
  const requestQuery = params.toString();
  const requestKey = `${requestQuery}|reload=${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    let isCurrent = true;
    getApi(`/users?${requestQuery}`)
      .then(({ data }) => {
        if (!isCurrent) return;
        const payload = data;
        if (
          !isRecord(payload) ||
          !Array.isArray(payload.users) ||
          !payload.users.every(isUser) ||
          !isApiPagination(payload.pagination) ||
          !isRecord(payload.summary) ||
          typeof payload.summary.totalUsers !== "number" ||
          typeof payload.summary.activeUsers !== "number" ||
          typeof payload.summary.adminUsers !== "number"
        ) {
          throw new Error("The API returned an invalid user list.");
        }
        setUsers(payload.users);
        setPagination(payload.pagination);
        setPage(Math.min(page, Math.max(1, payload.pagination.totalPages)));
        setRequestError(null);
        setSummary({
          totalUsers: payload.summary.totalUsers,
          activeUsers: payload.summary.activeUsers,
          adminUsers: payload.summary.adminUsers,
        });
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

  const activeCount = summary.activeUsers;
  const adminCount = summary.adminUsers;

  function openCreate() {
    setEditingUser(null);
    dialogRef.current?.showModal();
  }

  function openEdit(user: User) {
    setEditingUser(user);
    dialogRef.current?.showModal();
  }

  async function handleToggleStatus(user: User) {
    try {
      const updatedUser = await requestUser(`/${user.id}`, "PATCH", {
        isActive: !user.isActive,
      });
      if (updatedUser) setReloadKey((current) => current + 1);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to update account status.",
      );
    }
  }

  async function handleDeleteUser(user: User) {
    if (
      !window.confirm(
        `Hapus akun @${user.username}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    try {
      await requestUser(`/${user.id}`, "DELETE");
      setReloadKey((current) => current + 1);
      toast.success("Akun pengguna dihapus.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to delete user.",
      );
    }
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "");
    if (!username || !USER_ROLES.some((candidate) => candidate === role))
      return;
    if ((!editingUser || password) && password.length < 8) return;

    const body: Record<string, unknown> = { username, role };
    if (password) body.password = password;
    setIsSaving(true);
    try {
      const user = await requestUser(
        editingUser ? `/${editingUser.id}` : "",
        editingUser ? "PATCH" : "POST",
        body,
      );
      if (user) setReloadKey((current) => current + 1);
      form.reset();
      dialogRef.current?.close();
      toast.success(
        editingUser ? "Perubahan akun tersimpan." : "Akun pengguna dibuat.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to save user.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-content users-content">
      <section
        className="dashboard-heading users-page-heading"
        aria-labelledby="users-title"
      >
        <div>
          <span className="dashboard-eyebrow">AKSES &amp; AKUN</span>
          <h1 id="users-title">Manajemen Pengguna</h1>
          <p>Atur akun dan peran tim XL Perfumes.</p>
        </div>
        <div className="users-heading-actions">
          <button
            className="users-primary-button"
            type="button"
            onClick={openCreate}
          >
            <Plus size={16} aria-hidden="true" /> Tambah pengguna
          </button>
        </div>
      </section>

      <section className="users-summary" aria-label="Ringkasan pengguna">
        <SummaryCard
          icon={<PeopleIcon />}
          label="Total pengguna"
          value={summary.totalUsers}
          note="Semua akun terdaftar"
        />
        <SummaryCard
          icon={<CheckIcon />}
          label="Pengguna aktif"
          value={activeCount}
          note="Dapat mengakses sistem"
          green
        />
        <SummaryCard
          icon={<AdminIcon />}
          label="Administrator"
          value={adminCount}
          note="Akun pengelola sistem"
          gold
        />
      </section>

      <section
        className="users-table-section"
        aria-labelledby="users-table-title"
      >
        <header className="users-table-header">
          <div>
            <span className="dashboard-eyebrow">DAFTAR AKUN</span>
            <h2 id="users-table-title">
              Semua pengguna <span>{pagination.total}</span>
            </h2>
            <p>Kelola akses dan status akun pengguna.</p>
          </div>
          <div className="users-filters">
            <label className="users-search">
              <span className="sr-only">Cari pengguna</span>
              <Search aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => { setPage(1); setSearch(event.target.value); }}
                placeholder="Cari username"
              />
            </label>
            <label className="users-select">
              <span className="sr-only">Filter berdasarkan peran</span>
              <select
                value={roleFilter}
                onChange={(event) => { setPage(1); setRoleFilter(event.target.value); }}
              >
                <option value="all">Semua peran</option>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="users-select">
              <span className="sr-only">Filter berdasarkan status</span>
              <select
                value={statusFilter}
                onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
          </div>
        </header>

        {error && (
          <p className="users-error" role="alert">
            {error}
          </p>
        )}
        <DataTable<User>
          ariaLabel="Daftar pengguna"
          className="users-table"
          wrapperClassName="users-table-wrap"
          stateCellClassName="users-empty"
          columns={[
            {
              id: "username",
              header: "USERNAME",
              renderCell: (user) => (
                <div className="user-identity">
                  <span className="user-avatar" aria-hidden="true">
                    {user.username.charAt(0).toLocaleUpperCase("id-ID")}
                  </span>
                  <span>
                    <strong>@{user.username}</strong>
                    <small>ID {user.id}</small>
                  </span>
                </div>
              ),
            },
            {
              id: "role",
              header: "PERAN",
              renderCell: (user) => (
                <span className={`user-role user-role-${roleClass(user.role)}`}>
                  {roleLabel(user.role)}
                </span>
              ),
            },
            {
              id: "status",
              header: "STATUS",
              renderCell: (user) => (
                <span
                  className={`user-status ${user.isActive ? "is-active" : "is-inactive"}`}
                >
                  <span aria-hidden="true" />
                  {user.isActive ? "Aktif" : "Nonaktif"}
                </span>
              ),
            },
            {
              id: "created-at",
              header: "DIBUAT",
              className: "user-last-active",
              renderCell: (user) => formatCreatedAt(user.createdAt),
            },
            {
              id: "actions",
              header: "AKSI",
              headerClassName: "user-actions-heading",
              className: "user-actions-cell",
              renderCell: (user) => (
                <div className="user-row-actions">
                  <button
                    className="user-row-action"
                    type="button"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    className="user-row-action"
                    type="button"
                    onClick={() => void handleToggleStatus(user)}
                  >
                    <Power size={14} aria-hidden="true" />
                    {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    className="user-row-action user-delete-action"
                    type="button"
                    onClick={() => void handleDeleteUser(user)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              ),
            },
          ]}
          rows={users}
          getRowKey={(user) => user.id}
          hasError={Boolean(error)}
          isLoading={isLoading}
          loadingContent="Memuat pengguna…"
          emptyContent={
            <>
              <span className="users-empty-icon">
                <Search aria-hidden="true" />
              </span>
              <strong>
                {pagination.total
                  ? "Tidak ada pengguna ditemukan"
                  : "Belum ada pengguna"}
              </strong>
              <span>
                {pagination.total
                  ? "Coba ubah kata kunci atau filter."
                  : "Tambahkan akun baru untuk memulai."}
              </span>
            </>
          }
        />
        <ApiPagination
          page={pagination.page}
          limit={pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="pengguna"
          isLoading={isLoading}
          onPageChange={setPage}
          onLimitChange={(limit) => { setPage(1); setPageSize(limit); }}
        />
        <footer className="users-table-footer">
          <span>
            Total hasil setelah filter: <strong>{pagination.total}</strong> pengguna
          </span>
          <span>
            XL Perfumes <i>·</i> Data akun
          </span>
        </footer>
      </section>

      <DashboardFooter section="MANAJEMEN PENGGUNA" />

      <Modal
        className="users-dialog"
        ref={dialogRef}
        aria-labelledby="add-user-title"
        onClose={() => setEditingUser(null)}
      >
        <form
          className="app-modal-panel users-dialog-panel"
          key={editingUser?.id ?? "new-user"}
          onSubmit={handleSaveUser}
        >
          <header className="users-dialog-header">
            <div>
              <span className="dashboard-eyebrow">
                {editingUser ? "UBAH AKUN" : "AKUN BARU"}
              </span>
              <h2 id="add-user-title">
                {editingUser ? "Edit pengguna" : "Tambah pengguna"}
              </h2>
              <p>Buat username dan tentukan peran pengguna.</p>
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
          <div className="users-dialog-fields">
            <label className="users-form-field">
              <span>Username</span>
              <input
                name="username"
                autoComplete="username"
                placeholder="Contoh: anisa.putri"
                minLength={3}
                maxLength={50}
                defaultValue={editingUser?.username}
                required
              />
            </label>
            <label className="users-form-field">
              <span>Password{editingUser ? " (opsional)" : ""}</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  editingUser
                    ? "Kosongkan jika tidak diubah"
                    : "Minimal 8 karakter"
                }
                minLength={8}
                maxLength={72}
                required={!editingUser}
              />
            </label>
            <label className="users-form-field">
              <span>Peran</span>
              <select
                name="role"
                defaultValue={editingUser?.role ?? ""}
                required
              >
                <option value="" disabled>
                  Pilih peran
                </option>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <footer className="users-dialog-actions">
            <button
              className="users-secondary-button"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button
              className="users-primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Menyimpan…"
                : editingUser
                  ? "Simpan perubahan"
                  : "Buat akun"}
            </button>
          </footer>
          <p className="users-dialog-note">
            Password disimpan menggunakan hashing dan tidak dapat dilihat
            kembali.
          </p>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  green = false,
  gold = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
  green?: boolean;
  gold?: boolean;
}) {
  const colorClass = green
    ? "users-summary-icon-green"
    : gold
      ? "users-summary-icon-gold"
      : "";
  return (
    <article className="users-summary-card">
      <span className={`users-summary-icon ${colorClass}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>
          {value}
          <small>akun</small>
        </strong>
      </div>
      <span className="users-summary-note">{note}</span>
    </article>
  );
}

function PeopleIcon() {
  return <UsersRound aria-hidden="true" />;
}

function CheckIcon() {
  return <Check aria-hidden="true" />;
}

function AdminIcon() {
  return <ShieldCheck aria-hidden="true" />;
}
