"use client";

import { useRouter } from "next/navigation";
import type { PropertySummary } from "@/lib/types";
import { useUI } from "../ui-provider";

export function DetailTopBar({ property: p, crumb }: { property: PropertySummary; crumb: string }) {
  const router = useRouter();
  const { open, favorites, toggleFavorite } = useUI();
  const fav = favorites.has(p.id);
  const back = () => (window.history.length > 1 ? router.back() : router.push("/propiedades"));
  return (
    <div className="detail-bar">
      <button className="btn btn-secondary" onClick={back} style={{ height: 38 }}><i className="ph ph-arrow-left" style={{ fontSize: 16 }} />Volver</button>
      <span className="detail-crumb">{crumb}</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-icon btn-38" onClick={() => open({ type: "share", property: p })} aria-label="Compartir"><i className="ph ph-share-network" style={{ fontSize: 17 }} /></button>
        <button className="btn btn-secondary btn-icon btn-38" onClick={() => void toggleFavorite(p.id)} aria-label={fav ? "Quitar de guardadas" : "Guardar"} aria-pressed={fav} style={{ color: fav ? "var(--color-accent-300)" : "var(--color-text)" }}>
          <i className={fav ? "ph-fill ph-heart" : "ph ph-heart"} style={{ fontSize: 17 }} />
        </button>
      </div>
    </div>
  );
}
