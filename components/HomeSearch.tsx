"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_OPS, TYPES, TYPE_PLURAL } from "@/lib/format";
import { searchPath } from "@/lib/routes";
import type { Operation, PropertyType } from "@/lib/types";

/** Buscador de la portada: lleva al listado con operación, texto y tipo. */
export function HomeSearch() {
  const [op, setOp] = useState<Operation>("Venta");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<PropertyType | "">("");
  return (
    <div className="home-search">
      <div className="home-search-tabs">
        {NAV_OPS.map(([label, k]) => (
          <button key={k} type="button" onClick={() => setOp(k)} className={op === k ? "is-on" : ""}>{label}</button>
        ))}
      </div>
      <div className="home-search-row">
        <div className="input-icon" style={{ flex: "2 1 200px" }}>
          <i className="ph ph-map-pin" />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zona o barrio: Paraíso, Orosi…" style={{ height: 44 }} />
        </div>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as PropertyType | "")} style={{ flex: "1 1 140px", height: 44, width: "auto" }}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_PLURAL[t]}</option>)}
        </select>
        <Link href={searchPath({ operation: op, q: q.trim().slice(0, 80) || undefined, types: tipo ? [tipo] : [] })} className="btn btn-primary" style={{ flex: "0 0 auto", height: 44, padding: "0 20px", fontSize: 15 }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 17 }} />Buscar
        </Link>
      </div>
    </div>
  );
}
