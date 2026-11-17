"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date()).toLocaleUpperCase("id-ID");
}

function getServerLabel() {
  return "TANGGAL HARI INI";
}

export function TodayLabel() {
  const label = useSyncExternalStore(subscribe, getTodayLabel, getServerLabel);

  return <span className="topbar-date">{label}</span>;
}
