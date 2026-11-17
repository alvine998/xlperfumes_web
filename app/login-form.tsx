"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password"),
    };
    if (payload.username && payload.password) {
      if (payload.username === "admin" && payload.password === "admin123") {
        toast.success("Welcome back. Opening your collection…");
        router.push("/main/dashboard");
      } else {
        toast.error("Invalid username or password.");
      }
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
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <button className="submit-button" type="submit">
        <span>Sign in</span>
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.45-6 9.5-6 9.5 6 9.5 6-3.45 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.05 0 9.5 6 9.5 6a15.8 15.8 0 0 1-3.1 3.7M6.2 6.7C3.8 8.3 2.5 12 2.5 12s3.45 6 9.5 6c1.1 0 2.1-.2 3-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
