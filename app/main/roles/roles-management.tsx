"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Save, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApi, getApiError } from "@/lib/api";
import { USER_ROLES, type UserRole } from "@/lib/users";
import { isApiPagination } from "@/lib/pagination";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/permissions";

const FEATURES = [
  {
    key: "overview",
    label: "Ringkasan",
  },
  {
    key: "store_inventory",
    label: "Stok Toko",
  },
  {
    key: "warehouse_inventory",
    label: "Stok Gudang",
  },
  {
    key: "variants",
    label: "Daftar Varian",
  },
  {
    key: "products",
    label: "Daftar Produk",
  },
  {
    key: "generate_product",
    label: "Generate Produk",
  },
  {
    key: "print_product_barcodes",
    label: "Cetak Barcode Produk",
  },
  {
    key: "branchs",
    label: "Daftar Cabang",
  },
  {
    key: "zonas",
    label: "Daftar Zona",
  },
  {
    key: "stores",
    label: "Daftar Toko",
  },
  {
    key: "store_visit",
    label: "Kunjungan Toko",
  },
  {
    key: "print_store_barcodes",
    label: "Cetak Barcode Toko",
  },
  {
    key: "users",
    label: "Pengguna",
  },
  {
    key: "roles",
    label: "Akses Peran",
  },
  {
    key: "activity_logs",
    label: "Log Aktivitas",
  },
] as const satisfies ReadonlyArray<{ key: FeatureKey; label: string }>;

type Permissions = Record<UserRole, Record<FeatureKey, boolean>>;

const DEFAULT_PERMISSIONS: Permissions = {
  owner: {
    overview: true,
    store_inventory: true,
    activity_logs: true,
    stores: true,
    users: true,
    branchs: true,
    zonas: true,
    variants: true,
    products: true,
    generate_product: true,
    print_product_barcodes: true,
    store_visit: true,
    print_store_barcodes: true,
    warehouse_inventory: true,
    roles: true,
  },
  admin: {
    overview: true,
    store_inventory: true,
    activity_logs: true,
    stores: true,
    users: true,
    branchs: true,
    zonas: true,
    variants: true,
    products: true,
    generate_product: true,
    print_product_barcodes: true,
    store_visit: true,
    print_store_barcodes: true,
    warehouse_inventory: true,
    roles: true,
  },
  gudang: {
    overview: true,
    store_inventory: true,
    activity_logs: true,
    stores: true,
    users: true,
    branchs: true,
    zonas: true,
    variants: true,
    products: true,
    generate_product: true,
    print_product_barcodes: true,
    store_visit: true,
    print_store_barcodes: true,
    warehouse_inventory: true,
    roles: true,
  },
  collecting: {
    overview: true,
    store_inventory: true,
    activity_logs: true,
    stores: true,
    users: true,
    branchs: true,
    zonas: true,
    variants: true,
    products: true,
    generate_product: true,
    print_product_barcodes: true,
    store_visit: true,
    print_store_barcodes: true,
    warehouse_inventory: true,
    roles: true,
  },
  spg: {
    overview: true,
    store_inventory: true,
    activity_logs: true,
    stores: true,
    users: true,
    branchs: true,
    zonas: true,
    variants: true,
    products: true,
    generate_product: true,
    print_product_barcodes: true,
    store_visit: true,
    print_store_barcodes: true,
    warehouse_inventory: true,
    roles: true,
  },
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  gudang: "Gudang",
  collecting: "Collecting",
  spg: "SPG",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPermissions(value: unknown): value is Permissions {
  if (!isRecord(value)) return false;
  return USER_ROLES.every((role) => {
    const rolePermissions = value[role];
    return (
      isRecord(rolePermissions) &&
      FEATURE_KEYS.every((key) => typeof rolePermissions[key] === "boolean")
    );
  });
}

export function RolesManagement() {
  const [permissions, setPermissions] =
    useState<Permissions>(DEFAULT_PERMISSIONS);
  const [isReady, setIsReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getApi("/roles?page=1&limit=100")
      .then(({ data }) => {
        if (!isCurrent) return;
        if (!isRecord(data) || !Array.isArray(data.roles) || !isApiPagination(data.pagination)) {
          throw new Error("The API returned an invalid roles response.");
        }
        if (!isPermissions(data.permissions)) {
          throw new Error("The API returned an invalid permissions matrix.");
        }
        setPermissions(data.permissions);
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setSaveError(true);
          toast.error(getApiError(cause));
        }
      })
      .finally(() => {
        if (isCurrent) setIsReady(true);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  function togglePermission(role: UserRole, feature: FeatureKey) {
    setPermissions((current) => ({
      ...current,
      [role]: { ...current[role], [feature]: !current[role][feature] },
    }));
    setHasChanges(true);
    setSaved(false);
    setSaveError(false);
  }

  async function handleSave() {
    setIsReady(false);
    try {
      await api.put("/roles/permissions", { permissions });
      setHasChanges(false);
      setSaved(true);
      setSaveError(false);
      toast.success("Perubahan akses tersimpan.");
    } catch (cause) {
      setSaved(false);
      setSaveError(true);
      toast.error(getApiError(cause));
    } finally {
      setIsReady(true);
    }
  }

  function handleReset() {
    setPermissions(DEFAULT_PERMISSIONS);
    setHasChanges(true);
    setSaved(false);
    setSaveError(false);
  }

  const roleAccessCount = (role: UserRole) =>
    FEATURES.filter(({ key }) => permissions[role][key]).length;

  return (
    <div className="dashboard-content roles-content">
      <section
        className="dashboard-heading roles-heading"
        aria-labelledby="roles-title"
      >
        <div>
          <span className="dashboard-eyebrow">PENGATURAN AKSES</span>
          <h1 id="roles-title">Akses Peran</h1>
          <p>Pilih fitur yang dapat dibuka oleh setiap peran.</p>
        </div>
        <div className="roles-actions">
          <button
            className="users-secondary-button"
            type="button"
            onClick={handleReset}
          >
            <RotateCcw aria-hidden="true" /> Pulihkan default
          </button>
          <button
            className="users-primary-button"
            type="button"
            onClick={handleSave}
            disabled={!isReady || !hasChanges}
          >
            <Save aria-hidden="true" /> Simpan perubahan
          </button>
        </div>
      </section>

      <div className="roles-notice" role="note">
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong>Pengaturan akses fitur</strong>
          <span>
            Perubahan disimpan ke API dan berlaku sebagai akses RBAC. Minimal
            satu akun aktif harus tetap bisa mengelola peran.
          </span>
        </p>
      </div>

      <section className="roles-card" aria-labelledby="roles-matrix-title">
        <div className="roles-card-heading">
          <div>
            <span className="dashboard-eyebrow">PERAN TIM</span>
            <h2 id="roles-matrix-title">Matriks akses fitur</h2>
          </div>
          <span className="roles-count">
            {USER_ROLES.length} peran · {FEATURES.length} fitur
          </span>
        </div>
        <div className="roles-table-scroll">
          <table className="roles-table">
            <thead>
              <tr>
                <th scope="col">Fitur</th>
                {USER_ROLES.map((role) => (
                  <th
                    scope="col"
                    className={`roles-role-header roles-role-${role}`}
                    key={role}
                  >
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr
                  key={feature.key}
                  className={`roles-feature-${feature.key}`}
                >
                  <th scope="row">
                    <span>{feature.label}</span>
                  </th>
                  {USER_ROLES.map((role) => (
                    <td key={role}>
                      <label className="roles-toggle-label">
                        <input
                          type="checkbox"
                          checked={permissions[role][feature.key]}
                          onChange={() => togglePermission(role, feature.key)}
                          aria-label={`${ROLE_LABELS[role]}: ${feature.label}`}
                          disabled={!isReady}
                        />
                        <span className="roles-toggle" aria-hidden="true">
                          <Check />
                        </span>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="roles-card-footer">
          <span>Fitur aktif per peran</span>
          <div className="roles-role-summary">
            {USER_ROLES.map((role) => (
              <span key={role}>
                <strong>{ROLE_LABELS[role]}</strong>
                {roleAccessCount(role)}/{FEATURES.length} fitur
              </span>
            ))}
          </div>
        </div>
      </section>

      <p className="roles-save-status" aria-live="polite">
        {saved ? (
          <>
            <Check aria-hidden="true" /> Perubahan akses tersimpan.
          </>
        ) : saveError ? (
          "API akses tidak tersedia. Perubahan belum disimpan."
        ) : hasChanges ? (
          "Ada perubahan yang belum disimpan."
        ) : (
          ""
        )}
      </p>
    </div>
  );
}
