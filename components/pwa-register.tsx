"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        const oldRegistrations = registrations.filter((registration) =>
          registration.scope === `${window.location.origin}/` &&
          [registration.active, registration.waiting, registration.installing].some((worker) =>
            worker?.scriptURL === `${window.location.origin}/sw.js`));
        if (oldRegistrations.length === 0) return;
        const removed = await Promise.all(oldRegistrations.map((registration) => registration.unregister()));
        if (removed.some(Boolean) && navigator.serviceWorker.controller?.scriptURL === `${window.location.origin}/sw.js`) {
          window.location.reload();
        }
      }).catch(() => undefined);
      return;
    }
    const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
