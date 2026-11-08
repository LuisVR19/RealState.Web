"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { crc, OP_LABEL, priceSuffix, specs, waProperty } from "@/lib/format";
import { propertyPath } from "@/lib/routes";
import type { Agent, PropertySummary } from "@/lib/types";
import { useUI } from "./ui-provider";

interface Props {
  property: PropertySummary;
  agent: Agent;
  /** Resaltada (al pasar el cursor por la tarjeta o su marcador en el mapa). */
  active?: boolean;
  onHover?: (id: string | null) => void;
}

export function PropertyCard({ property: p, agent: a, active, onHover }: Props) {
  const router = useRouter();
  const { open, favorites, toggleFavorite } = useUI();
  const [idx, setIdx] = useState(0);
  const fav = favorites.has(p.id);
  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); fn(); };
  const n = p.images.length;
  const href = propertyPath(p);

  return (
    <div className={`pcard${active ? " is-active" : ""}`} data-property={p.id} onClick={() => router.push(href)} onMouseEnter={() => onHover?.(p.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="pcard-media">
        <div className="lighten fill"><img src={p.images[idx]} alt={p.title} loading="lazy" /></div>
        <div className="pcard-tags">
          <span className="tag tag-neutral">{OP_LABEL[p.operation]}</span>
          {p.tag && <span className="tag tag-accent">{p.tag}</span>}
        </div>
        <button onClick={stop(() => void toggleFavorite(p.id))} aria-label={fav ? "Quitar de guardados" : "Guardar anuncio"} aria-pressed={fav} className="pcard-fav" style={{ color: fav ? "var(--color-accent-300)" : "var(--color-text)" }}>
          <i className={fav ? "ph-fill ph-heart" : "ph ph-heart"} style={{ fontSize: 18 }} />
        </button>
        {n > 1 && (
          <>
            <button onClick={stop(() => setIdx((idx - 1 + n) % n))} aria-label="Foto anterior" className="pcard-nav is-prev"><i className="ph ph-caret-left" /></button>
            <button onClick={stop(() => setIdx((idx + 1) % n))} aria-label="Foto siguiente" className="pcard-nav is-next"><i className="ph ph-caret-right" /></button>
            <span className="pcard-counter"><i className="ph ph-camera" style={{ fontSize: 12 }} />{idx + 1}/{n}</span>
          </>
        )}
      </div>
      <div className="pcard-body">
        <div className="pcard-price">
          {p.operation === "Preventa" && <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>Desde</span>}
          <span className="pcard-price-main">{crc(p.price)}</span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{priceSuffix(p)}</span>
        </div>
        <Link href={href} className="pcard-title" onClick={(e) => e.stopPropagation()}>{p.title}</Link>
        <div className="pcard-zone"><i className="ph ph-map-pin" style={{ fontSize: 14 }} />{p.zone}, {p.canton}</div>
        <div className="pcard-specs">
          {specs(p).map((s) => <span key={s.label}><i className={`ph ${s.icon}`} />{s.label}</span>)}
        </div>
        <div className="pcard-foot">
          <span className="avatar avatar-28">{a.initials}</span>
          <span className="pcard-agent">{a.name}</span>
          <a className="btn btn-secondary btn-icon" href={waProperty(a, p)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} aria-label="Escribir por WhatsApp"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} /></a>
          <button className="btn btn-primary" onClick={stop(() => open({ type: "visit", agent: a, property: p }))} style={{ height: 36 }}>
            <i className="ph ph-calendar-check" style={{ fontSize: 16 }} />Agendar
          </button>
        </div>
      </div>
    </div>
  );
}
