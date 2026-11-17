"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL, getApiError } from "@/lib/api";
import { isUser, type User } from "@/lib/users";

export function ProfileMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiError(response));
        const payload: unknown = await response.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("user" in payload) ||
          !isUser(payload.user)
        ) {
          throw new Error("The API returned an invalid user profile.");
        }
        setUser(payload.user);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load profile.");
      });
  }, []);

  async function handleLogout() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await getApiError(response));
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  const username = user?.username ?? "Memuat akun";
  const role = user?.role ?? "";
  const initial = user?.username.charAt(0).toLocaleUpperCase("id-ID") ?? "…";

  return (
    <details className="profile-dropdown">
      <summary className="topbar-profile" aria-label={`Buka menu profil ${username}`}>
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <span className="topbar-profile-copy">
          <strong>{username}</strong>
          <small>{role}</small>
        </span>
        <span className="topbar-profile-menu" aria-hidden="true"><ChevronDown size={15} /></span>
      </summary>
      <div className="profile-dropdown-panel">
        <div className="profile-dropdown-heading">
          <span className="profile-avatar" aria-hidden="true">{initial}</span>
          <span><strong>{username}</strong><small>{role}</small></span>
        </div>
        <button type="button" onClick={handleLogout}>Keluar</button>
      </div>
    </details>
  );
}
