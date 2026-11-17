"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Plus, Search, ShieldCheck, Trash2, UserRoundPen, UsersRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL, getApiError } from "@/lib/api";
import { isUser, USER_ROLES, type User, type UserRole } from "@/lib/users";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestUser(path: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}/users${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(await getApiError(response));
  if (response.status === 204) return null;

  const payload: unknown = await response.json();
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
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/users`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiError(response));
        const payload: unknown = await response.json();
        if (!isRecord(payload) || !Array.isArray(payload.users) || !payload.users.every(isUser)) {
          throw new Error("The API returned an invalid user list.");
        }
        setUsers(payload.users);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        const message = cause instanceof Error ? cause.message : "Unable to load users.";
        setError(message);
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const activeCount = users.filter((user) => user.isActive).length;
  const adminCount = users.filter((user) => user.role === "admin").length;
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return users.filter((user) => {
      const matchesQuery = !query || user.username.toLocaleLowerCase("id-ID").includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" ? user.isActive : !user.isActive);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

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
      const updatedUser = await requestUser(`/${user.id}`, "PATCH", { isActive: !user.isActive });
      if (updatedUser) setUsers((current) => current.map((item) => item.id === user.id ? updatedUser : item));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to update account status.");
    }
  }

  async function handleDeleteUser(user: User) {
    if (!window.confirm(`Hapus akun @${user.username}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await requestUser(`/${user.id}`, "DELETE");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      toast.success("Akun pengguna dihapus.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to delete user.");
    }
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "");
    if (!username || !USER_ROLES.some((candidate) => candidate === role)) return;
    if ((!editingUser || password) && password.length < 8) return;

    const body: Record<string, unknown> = { username, role };
    if (password) body.password = password;
    setIsSaving(true);
    try {
      const user = await requestUser(editingUser ? `/${editingUser.id}` : "", editingUser ? "PATCH" : "POST", body);
      if (user) {
        setUsers((current) => editingUser
          ? current.map((item) => item.id === user.id ? user : item)
          : [user, ...current]);
      }
      form.reset();
      dialogRef.current?.close();
      toast.success(editingUser ? "Perubahan akun tersimpan." : "Akun pengguna dibuat.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to save user.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-content users-content">
      <section className="dashboard-heading users-page-heading" aria-labelledby="users-title">
        <div>
          <span className="dashboard-eyebrow">AKSES &amp; AKUN</span>
          <h1 id="users-title">Manajemen Pengguna</h1>
          <p>Atur akun dan peran tim XL Perfumes.</p>
        </div>
        <div className="users-heading-actions">
          <span className="report-updated"><span className="live-indicator" /> TERHUBUNG KE API</span>
          <button className="users-primary-button" type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" /> Tambah pengguna
          </button>
        </div>
      </section>

      <section className="users-summary" aria-label="Ringkasan pengguna">
        <SummaryCard icon={<PeopleIcon />} label="Total pengguna" value={users.length} note="Semua akun terdaftar" />
        <SummaryCard icon={<CheckIcon />} label="Pengguna aktif" value={activeCount} note="Dapat mengakses sistem" green />
        <SummaryCard icon={<AdminIcon />} label="Administrator" value={adminCount} note="Akun pengelola sistem" gold />
      </section>

      <section className="users-table-section" aria-labelledby="users-table-title">
        <header className="users-table-header">
          <div>
            <span className="dashboard-eyebrow">DAFTAR AKUN</span>
            <h2 id="users-table-title">Semua pengguna <span>{filteredUsers.length}</span></h2>
            <p>Kelola akses dan status akun pengguna.</p>
          </div>
          <div className="users-filters">
            <label className="users-search">
              <span className="sr-only">Cari pengguna</span>
              <Search aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari username" />
            </label>
            <label className="users-select">
              <span className="sr-only">Filter berdasarkan peran</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">Semua peran</option>
                {USER_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            </label>
            <label className="users-select">
              <span className="sr-only">Filter berdasarkan status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
          </div>
        </header>

        {error && <p className="users-error" role="alert">{error}</p>}
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr><th scope="col">USERNAME</th><th scope="col">PERAN</th><th scope="col">STATUS</th><th scope="col">DIBUAT</th><th scope="col"><span className="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-identity">
                      <span className="user-avatar" aria-hidden="true">{user.username.charAt(0).toLocaleUpperCase("id-ID")}</span>
                      <span><strong>@{user.username}</strong><small>ID {user.id}</small></span>
                    </div>
                  </td>
                  <td><span className={`user-role user-role-${roleClass(user.role)}`}>{roleLabel(user.role)}</span></td>
                  <td><span className={`user-status ${user.isActive ? "is-active" : "is-inactive"}`}><span aria-hidden="true" />{user.isActive ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="user-last-active">{formatCreatedAt(user.createdAt)}</td>
                  <td>
                    <div className="user-row-actions">
                      <button className="user-row-action" type="button" onClick={() => openEdit(user)}><UserRoundPen size={14} aria-hidden="true" />Edit</button>
                      <button className="user-row-action" type="button" onClick={() => void handleToggleStatus(user)}>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button className="user-row-action user-delete-action" type="button" onClick={() => void handleDeleteUser(user)}><Trash2 size={14} aria-hidden="true" />Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !error && filteredUsers.length === 0 && (
                <tr><td className="users-empty" colSpan={5}>
                  <span className="users-empty-icon"><Search aria-hidden="true" /></span>
                  <strong>{users.length ? "Tidak ada pengguna ditemukan" : "Belum ada pengguna"}</strong>
                  <span>{users.length ? "Coba ubah kata kunci atau filter." : "Tambahkan akun baru untuk memulai."}</span>
                </td></tr>
              )}
              {isLoading && <tr><td className="users-empty" colSpan={5}>Memuat pengguna…</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="users-table-footer">
          <span>Menampilkan <strong>{filteredUsers.length}</strong> dari <strong>{users.length}</strong> pengguna</span>
          <span>XL Perfumes <i>·</i> Data akun</span>
        </footer>
      </section>

      <footer className="dashboard-footer"><span>XL PERFUMES <i>·</i> MANAJEMEN PENGGUNA</span><span>© 2026 XL PERFUMES</span></footer>

      <dialog className="users-dialog" ref={dialogRef} aria-labelledby="add-user-title" onClose={() => setEditingUser(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <form className="users-dialog-panel" key={editingUser?.id ?? "new-user"} onSubmit={handleSaveUser}>
          <header className="users-dialog-header">
            <div><span className="dashboard-eyebrow">{editingUser ? "UBAH AKUN" : "AKUN BARU"}</span><h2 id="add-user-title">{editingUser ? "Edit pengguna" : "Tambah pengguna"}</h2><p>Buat username dan tentukan peran pengguna.</p></div>
            <button className="notification-close" type="button" aria-label="Tutup formulir" onClick={() => dialogRef.current?.close()}><X size={16} aria-hidden="true" /></button>
          </header>
          <div className="users-dialog-fields">
            <label className="users-form-field"><span>Username</span><input name="username" autoComplete="username" placeholder="Contoh: anisa.putri" minLength={3} maxLength={50} defaultValue={editingUser?.username} required /></label>
            <label className="users-form-field"><span>Password{editingUser ? " (opsional)" : ""}</span><input name="password" type="password" autoComplete="new-password" placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"} minLength={8} maxLength={72} required={!editingUser} /></label>
            <label className="users-form-field"><span>Peran</span><select name="role" defaultValue={editingUser?.role ?? ""} required><option value="" disabled>Pilih peran</option>{USER_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
          </div>
          <footer className="users-dialog-actions">
            <button className="users-secondary-button" type="button" onClick={() => dialogRef.current?.close()}>Batal</button>
            <button className="users-primary-button" type="submit" disabled={isSaving}>{isSaving ? "Menyimpan…" : editingUser ? "Simpan perubahan" : "Buat akun"}</button>
          </footer>
          <p className="users-dialog-note">Password disimpan menggunakan hashing dan tidak dapat dilihat kembali.</p>
        </form>
      </dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, note, green = false, gold = false }: { icon: ReactNode; label: string; value: number; note: string; green?: boolean; gold?: boolean }) {
  const colorClass = green ? "users-summary-icon-green" : gold ? "users-summary-icon-gold" : "";
  return <article className="users-summary-card"><span className={`users-summary-icon ${colorClass}`}>{icon}</span><div><span>{label}</span><strong>{value}<small>akun</small></strong></div><span className="users-summary-note">{note}</span></article>;
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
