"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { api, getApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setIsSubmitting(true);

    try {
      await api.post("/auth/login", { username, password });

      toast.success("Berhasil masuk.");
      router.replace("/main/dashboard");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <Input
        id="username"
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="Enter your username"
        required
      />

      <Input
        id="password"
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        endAdornment={
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        }
      />

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? "Signing in…" : "Sign in"}</span>
        <ArrowUpRight aria-hidden="true" />
      </button>
    </form>
  );
}
