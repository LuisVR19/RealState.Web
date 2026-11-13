"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { priceShortLabel } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

const STREETS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
/** Créditos que exige Esri para World Street Map. */
export const MAP_ATTRIBUTION = "Esri, HERE, Garmin, © OpenStreetMap";

/** Mapa de calles a color de Esri (sin clave de acceso): calles con nombre, rutas, agua y parques. */
export async function addTiles(map: LeafletMap) {
  const L = await import("leaflet");
  L.tileLayer(STREETS, { maxZoom: 18, attribution: MAP_ATTRIBUTION }).addTo(map);
  map.setMaxZoom(18);
}

const markerHtml = (p: PropertySummary, act: boolean) =>
  `<div class="map-dot${act ? " is-active" : ""}"></div><div class="map-price${act ? " is-active" : ""}">${priceShortLabel(p)}</div>`;

interface Props {
  properties: PropertySummary[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  /** Cambia cuando el mapa vuelve a ser visible (p. ej. en celular), para recalcular su tamaño. */
  visibleKey?: string;
  mapRef?: React.RefObject<LeafletMap | null>;
}

export function SearchMap({ properties, activeId, onSelect, visibleKey, mapRef }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([9.855, -83.9], 12);
      map.current = m;
      if (mapRef) mapRef.current = m;
      await addTiles(m);
      m.on("click", () => onSelect(null));
      properties.forEach((p) => {
        const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", iconSize: [0, 0], iconAnchor: [0, 0], html: markerHtml(p, false) }) }).addTo(m);
        mk.on("click", () => onSelect(p.id));
        markers.current.set(p.id, mk);
      });
      if (properties.length) m.fitBounds(L.latLngBounds(properties.map((p) => [p.lat, p.lng] as [number, number])), { padding: [70, 70], maxZoom: 14 });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      markers.current.forEach((mk, id) => {
        const p = properties.find((x) => x.id === id);
        if (!p) return;
        const act = id === activeId;
        mk.setIcon(L.divIcon({ className: "", iconSize: [0, 0], iconAnchor: [0, 0], html: markerHtml(p, act) }));
        mk.setZIndexOffset(act ? 1000 : 0);
      });
    })();
  }, [activeId, properties]);

  useEffect(() => {
    const t = setTimeout(() => map.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [visibleKey]);

  return <div ref={el} className="map-canvas" />;
}
