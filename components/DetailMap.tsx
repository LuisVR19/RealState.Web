"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { addTiles } from "./SearchMap";

/** Mapa de la ficha: zona aproximada (círculo de 300 m), sin el punto exacto. */
export function DetailMap({ lat, lng }: { lat: number; lng: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: false, scrollWheelZoom: false }).setView([lat, lng], 15);
      map.attributionControl.setPrefix(false);
      await addTiles(map);
      const acc = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#1f4e46";
      L.circle([lat, lng], { radius: 300, color: acc, weight: 1.5, fillColor: acc, fillOpacity: 0.18 }).addTo(map);
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [lat, lng]);
  return <div ref={el} className="detail-map" />;
}
