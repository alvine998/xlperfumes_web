"use client";

import { useMemo, useRef, useState } from "react";

type UserRole = "Owner" | "Admin" | "Gudang" | "Collect" | "SPG";
type UserStatus = "Aktif" | "Nonaktif";

type User = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  branch: string;
  status: UserStatus;
  lastActive: string;
};

const initialUsers: User[] = [
  { id: 1, name: "Alex Morgan", username: "alex.morgan", role: "Owner", branch: "Semua cabang", status: "Aktif", lastActive: "Baru saja" },
  { id: 2, name: "Nadia Putri", username: "nadia.putri", role: "Admin", branch: "Jakarta Selatan", status: "Aktif", lastActive: "12 menit lalu" },
  { id: 3, name: "Rizky Pratama", username: "rizky.pratama", role: "Gudang", branch: "Bandung", status: "Aktif", lastActive: "1 jam lalu" },
  { id: 4, name: "Maya Santoso", username: "maya.santoso", role: "SPG", branch: "Surabaya", status: "Aktif", lastActive: "Hari ini, 09.42" },
  { id: 5, name: "Dimas Saputra", username: "dimas.saputra", role: "Collect", branch: "Yogyakarta", status: "Nonaktif", lastActive: "14 Nov 2026" },
  { id: 6, name: "Clara Wijaya", username: "clara.wijaya", role: "SPG", branch: "Jakarta Selatan", status: "Aktif", lastActive: "Kemarin" },
  { id: 7, name: "Fajar Hidayat", username: "fajar.hidayat", role: "Gudang", branch: "Medan", status: "Aktif", lastActive: "Kemarin" },
  { id: 8, name: "Siti Rahma", username: "siti.rahma", role: "Collect", branch: "Bandung", status: "Nonaktif", lastActive: "08 Nov 2026" },
];

const roles: UserRole[] = ["Owner", "Admin", "Gudang", "Collect", "SPG"];
const branches = ["Semua cabang", "Jakarta Selatan", "Bandung", "Surabaya", "Yogyakarta", "Medan"];

export function UsersManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeCount = users.filter((user) => user.status === "Aktif").length;
  const branchCount = new Set(users.map((user) => user.branch)).size;
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return users.filter((user) => {
      const matchesQuery = !query || `${user.name} ${user.username} ${user.branch}`.toLocaleLowerCase("id-ID").includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function handleToggleStatus(id: number) {
    setUsers((currentUsers) => currentUsers.map((user) => user.id === id
      ? { ...user, status: user.status === "Aktif" ? "Nonaktif" : "Aktif" }
      : user));
  }

  function handleOpenCreate() {
    setEditingUser(null);
    dialogRef.current?.showModal();
  }

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    dialogRef.current?.showModal();
  }

  function handleDeleteUser(user: User) {
    if (!window.confirm(`Hapus akun ${user.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
  }

  function handleSaveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const roleValue = String(formData.get("role") ?? "");
    const branch = String(formData.get("branch") ?? "");
    if (!name || !username || (!editingUser && password.length < 8) || (password.length > 0 && password.length < 8) || !isUserRole(roleValue) || !branch) return;
    const role = roleValue;

    if (editingUser) {
      setUsers((currentUsers) => currentUsers.map((user) => user.id === editingUser.id
        ? { ...user, name, username, role, branch }
        : user));
    } else {
      setUsers((currentUsers) => [{
        id: Math.max(0, ...currentUsers.map((user) => user.id)) + 1,
        name,
        username,
        role,
        branch,
        status: "Aktif",
        lastActive: "Belum pernah masuk",
      }, ...currentUsers]);
    }
    event.currentTarget.reset();
    setEditingUser(null);
    dialogRef.current?.close();
  }

  return (
    <div className="dashboard-content users-content">
      <section className="dashboard-heading users-page-heading" aria-labelledby="users-title">
        <div>
          <span className="dashboard-eyebrow">AKSES &amp; AKUN</span>
          <h1 id="users-title">Manajemen Pengguna</h1>
          <p>Atur akun dan akses tim di seluruh cabang XL Perfumes.</p>
        </div>
        <div className="users-heading-actions">
          <span className="report-updated"><span className="live-indicator" /> DATA CONTOH</span>
          <button className="users-primary-button" type="button" onClick={handleOpenCreate}><span aria-hidden="true">＋</span> Tambah pengguna</button>
        </div>
      </section>

      <section className="users-summary" aria-label="Ringkasan pengguna">
        <article className="users-summary-card"><span className="users-summary-icon"><PeopleIcon /></span><div><span>Total pengguna</span><strong>{users.length}<small>akun</small></strong></div><span className="users-summary-note">Semua akun terdaftar</span></article>
        <article className="users-summary-card"><span className="users-summary-icon users-summary-icon-green"><CheckIcon /></span><div><span>Pengguna aktif</span><strong>{activeCount}<small>akun</small></strong></div><span className="users-summary-note">Dapat mengakses sistem</span></article>
        <article className="users-summary-card"><span className="users-summary-icon users-summary-icon-gold"><BranchMiniIcon /></span><div><span>Cakupan cabang</span><strong>{branchCount}<small>lokasi</small></strong></div><span className="users-summary-note">Termasuk akses pusat</span></article>
      </section>

      <section className="users-table-section" aria-labelledby="users-table-title">
        <header className="users-table-header">
          <div><span className="dashboard-eyebrow">DAFTAR AKUN</span><h2 id="users-table-title">Semua pengguna <span>{filteredUsers.length}</span></h2><p>Pilih pengguna untuk meninjau peran dan aksesnya.</p></div>
          <div className="users-filters">
          <label className="users-search"><span className="sr-only">Cari pengguna</span><SearchIcon /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau username" /></label>
            <label className="users-select"><span className="sr-only">Filter berdasarkan peran</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Semua peran</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="users-select"><span className="sr-only">Filter berdasarkan status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select></label>
          </div>
        </header>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead><tr><th scope="col">PENGGUNA</th><th scope="col">PERAN</th><th scope="col">CABANG</th><th scope="col">STATUS</th><th scope="col">AKTIVITAS TERAKHIR</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>
              {filteredUsers.map((user) => <tr key={user.id}>
                <td><div className="user-identity"><span className="user-avatar" aria-hidden="true">{getInitials(user.name)}</span><span><strong>{user.name}</strong><small>@{user.username}</small></span></div></td>
                <td><span className={`user-role user-role-${roleSlug(user.role)}`}>{user.role}</span></td>
                <td className="user-branch">{user.branch}</td>
                <td><span className={`user-status ${user.status === "Aktif" ? "is-active" : "is-inactive"}`}><span aria-hidden="true" />{user.status}</span></td>
                <td className="user-last-active">{user.lastActive}</td>
                <td><div className="user-row-actions"><button className="user-row-action" type="button" onClick={() => handleOpenEdit(user)}>Edit</button><button className="user-row-action" type="button" onClick={() => handleToggleStatus(user.id)} aria-label={`${user.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} akun ${user.name}`}>{user.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}</button><button className="user-row-action user-delete-action" type="button" onClick={() => handleDeleteUser(user)}>Hapus</button></div></td>
              </tr>)}
              {filteredUsers.length === 0 && <tr><td className="users-empty" colSpan={6}><span className="users-empty-icon"><SearchIcon /></span><strong>Tidak ada pengguna ditemukan</strong><span>Coba ubah kata kunci atau filter yang dipilih.</span><button type="button" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}>Hapus semua filter</button></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="users-table-footer"><span>Menampilkan <strong>{filteredUsers.length ? 1 : 0}–{filteredUsers.length}</strong> dari <strong>{filteredUsers.length}</strong> pengguna</span><span>Data akun contoh <i>·</i> XL Perfumes</span></footer>
      </section>

      <footer className="dashboard-footer"><span>XL PERFUMES <i>·</i> MANAJEMEN PENGGUNA</span><span>© 2026 XL PERFUMES</span></footer>

      <dialog className="users-dialog" ref={dialogRef} aria-labelledby="add-user-title" onClose={() => setEditingUser(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <form className="users-dialog-panel" key={editingUser?.id ?? "new-user"} onSubmit={handleSaveUser}>
          <header className="users-dialog-header"><div><span className="dashboard-eyebrow">{editingUser ? "UBAH AKUN" : "AKUN BARU"}</span><h2 id="add-user-title">{editingUser ? "Edit pengguna" : "Tambah pengguna"}</h2><p>Isi informasi pengguna dan tentukan akses cabangnya.</p></div><button className="notification-close" type="button" aria-label="Tutup formulir" onClick={() => dialogRef.current?.close()}>×</button></header>
          <div className="users-dialog-fields">
            <label className="users-form-field"><span>Nama</span><input name="name" autoComplete="name" placeholder="Contoh: Anisa Putri" defaultValue={editingUser?.name} required /></label>
            <label className="users-form-field"><span>Username</span><input name="username" autoComplete="username" placeholder="Contoh: anisa.putri" defaultValue={editingUser?.username} minLength={3} required /></label>
            <label className="users-form-field"><span>Password{editingUser ? " (opsional)" : ""}</span><input name="password" type="password" autoComplete="new-password" placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"} minLength={8} required={!editingUser} /></label>
            <label className="users-form-field"><span>Peran</span><select name="role" defaultValue={editingUser?.role ?? ""} required><option value="" disabled>Pilih peran</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="users-form-field"><span>Cabang</span><select name="branch" defaultValue={editingUser?.branch ?? ""} required><option value="" disabled>Pilih cabang</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
          </div>
          <footer className="users-dialog-actions"><button className="users-secondary-button" type="button" onClick={() => dialogRef.current?.close()}>Batal</button><button className="users-primary-button" type="submit">{editingUser ? "Simpan perubahan" : "Buat akun"}</button></footer>
          <p className="users-dialog-note">{editingUser ? "Perubahan akun hanya tersimpan pada sesi ini. Password demo tidak disimpan." : "Akun baru hanya tersimpan pada sesi ini. Password demo tidak disimpan."}</p>
        </form>
      </dialog>
    </div>
  );
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("id-ID");
}

function roleSlug(role: UserRole) {
  return role.toLocaleLowerCase("id-ID").replaceAll(" ", "-");
}

function isUserRole(value: string): value is UserRole {
  return roles.some((role) => role === value);
}

function PeopleIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="7.5" cy="6.3" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.8 16c.4-2.7 2-4.1 4.7-4.1s4.3 1.4 4.7 4.1M13 4.2a2.4 2.4 0 0 1 0 4.7m1.2 3.1c1.8.5 2.8 1.8 3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4.5 10.3 3.6 3.5 7.5-7.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function BranchMiniIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17s5-4.4 5-9a5 5 0 1 0-10 0c0 4.6 5 9 5 9Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="10" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.3"/></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.7" stroke="currentColor" strokeWidth="1.4"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
