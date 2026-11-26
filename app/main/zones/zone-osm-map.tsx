"use client";

import { useEffect, useRef, useState } from "react";
import type { Store } from "@/lib/stores";

type OsrmRoute = {
  coordinates: [number, number][];
  distance: number;
  duration: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOsrmRoute(value: unknown): OsrmRoute {
  if (!isRecord(value) || value.code !== "Ok" || !Array.isArray(value.routes)) {
    throw new Error("OpenStreetMap tidak menemukan rute untuk titik-titik ini.");
  }
  const route = value.routes[0];
  if (
    !isRecord(route) ||
    typeof route.distance !== "number" ||
    typeof route.duration !== "number" ||
    !isRecord(route.geometry) ||
    !Array.isArray(route.geometry.coordinates)
  ) {
    throw new Error("Data rute dari layanan peta tidak valid.");
  }
  const coordinates = route.geometry.coordinates.filter(
    (coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) &&
      coordinate.length === 2 &&
      typeof coordinate[0] === "number" &&
      typeof coordinate[1] === "number",
  );
  if (coordinates.length < 2) {
    throw new Error("Data rute dari layanan peta tidak memiliki cukup titik.");
  }
  if (coordinates.length !== route.geometry.coordinates.length) {
    throw new Error("Data rute dari layanan peta tidak valid.");
  }
  return { coordinates, distance: route.distance, duration: route.duration };
}

function formatRouteSummary(route: OsrmRoute) {
  const distance = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(route.distance / 1000);
  const minutes = Math.round(route.duration / 60);
  return `${distance} km · sekitar ${minutes} menit berkendara`;
}

type ZoneOsmMapProps = {
  stores: Store[];
  startLocation?: { latitude: number; longitude: number } | null;
};

export function ZoneOsmMap({ stores, startLocation = null }: ZoneOsmMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(stores.length > 1);
  const [routeSummary, setRouteSummary] = useState("");
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    const element = mapRef.current;
    if (!element || stores.length === 0) return;

    let isCurrent = true;
    let map: import("leaflet").Map | null = null;
    const controller = new AbortController();
    setIsLoadingRoute(stores.length > 1);
    setRouteSummary("");
    setRouteError("");

    async function renderMap() {
      const leaflet = await import("leaflet");
      if (!isCurrent || !mapRef.current) return;

      const firstStore = stores[0];
      if (!firstStore) return;
      const start = startLocation ?? firstStore;
      const activeMap = leaflet.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      })
        .setView([start.latitude, start.longitude], 13);
      map = activeMap;
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(activeMap);

      const storePoints = stores.map((store, index) => {
        const marker = leaflet.marker([store.latitude, store.longitude], {
          icon: leaflet.divIcon({
            className: "zones-map-marker",
            html: `<span>${index + 1}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(activeMap);
        const popup = document.createElement("span");
        popup.textContent = `${index + 1}. ${store.name}`;
        marker.bindPopup(popup);
        return leaflet.latLng(store.latitude, store.longitude);
      });
      const routeLocations = startLocation
        ? [startLocation, ...stores]
        : stores;
      const startPoint = leaflet.latLng(start.latitude, start.longitude);
      if (startLocation) {
        const startMarker = leaflet.marker(startPoint, {
          icon: leaflet.divIcon({
            className: "zones-map-marker zones-map-start-marker",
            html: "<span>Awal</span>",
            iconSize: [48, 30],
            iconAnchor: [24, 15],
          }),
        }).addTo(activeMap);
        const popup = document.createElement("span");
        popup.textContent = "Lokasi Anda";
        startMarker.bindPopup(popup);
      }

      if (stores.length === 1 && !startLocation) {
        const [storePoint] = storePoints;
        if (storePoint) activeMap.setView(storePoint, 15);
        setIsLoadingRoute(false);
        return;
      }

      try {
        const locations = routeLocations
          .map(({ longitude, latitude }) => `${longitude},${latitude}`)
          .join(";");
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${locations}?overview=full&geometries=geojson&steps=false`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Rute OpenStreetMap tidak dapat dimuat saat ini.");
        }
        const route = parseOsrmRoute(await response.json());
        if (!isCurrent) return;

        const routePoints = route.coordinates.map(([longitude, latitude]) =>
          leaflet.latLng(latitude, longitude),
        );
        leaflet.polyline(routePoints, {
          className: "zones-route-line",
          color: "#2563eb",
          weight: 5,
          opacity: 0.85,
        }).addTo(activeMap);
        activeMap.fitBounds(leaflet.latLngBounds([...storePoints, startPoint, ...routePoints]), {
          padding: [32, 32],
          maxZoom: 14,
          animate: false,
        });
        setRouteSummary(formatRouteSummary(route));
      } catch (cause) {
        if (!isCurrent || controller.signal.aborted) return;
        setRouteError(
          cause instanceof Error
            ? cause.message
            : "Rute OpenStreetMap tidak dapat dimuat saat ini.",
        );
        activeMap.fitBounds(leaflet.latLngBounds([...storePoints, startPoint]), {
          padding: [32, 32],
          maxZoom: 14,
          animate: false,
        });
      } finally {
        if (isCurrent) setIsLoadingRoute(false);
      }
    }

    void renderMap().catch((cause: unknown) => {
      if (!isCurrent || controller.signal.aborted) return;
      setRouteError(
        cause instanceof Error
          ? cause.message
          : "Peta OpenStreetMap tidak dapat dimuat saat ini.",
      );
      setIsLoadingRoute(false);
    });

    return () => {
      isCurrent = false;
      controller.abort();
      map?.remove();
    };
  }, [stores, startLocation]);

  if (stores.length === 0) return null;

  return (
    <div className="zones-osm-map-section">
      <div
        aria-label="Peta OpenStreetMap dan rute toko berdasarkan urutan"
        className="zones-osm-map"
        ref={mapRef}
        role="region"
      />
      <div
        aria-live="polite"
        className={`zones-osm-map-caption${routeError ? " is-error" : ""}`}
      >
        {isLoadingRoute
          ? "Memuat rute berdasarkan urutan toko…"
          : routeError || routeSummary || "Titik toko ditampilkan berurutan pada peta."}
      </div>
    </div>
  );
}
