"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABEL, categoryOf, NAV_OPS, TYPE_PLURAL, typesOf } from "@/lib/format";
import { searchPath } from "@/lib/routes";
import type { Category, Operation, PropertyType } from "@/lib/types";

/** Valor del selector: "" (todo), "cat:<categoría>" o un tipo. */
type Pick = "" | `cat:${Category}` | PropertyType;

/** Buscador de la portada: lleva al catálogo con operación, texto y categoría o tipo. */
export function HomeSearch() {
  const [op, setOp] = useState<Operation>("Venta");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Pick>("");
  const category: Category | null = pick.startsWith("cat:") ? (pick.slice(4) as Category) : pick ? categoryOf(pick as PropertyType) : null;
  const types = pick && !pick.startsWith("cat:") ? [pick as PropertyType] : [];
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
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zona, marca o modelo: Paraíso, Toyota…" style={{ height: 44 }} />
        </div>
        <select className="input" aria-label="Qué buscas" value={pick} onChange={(e) => setPick(e.target.value as Pick)} style={{ flex: "1 1 140px", height: 44, width: "auto" }}>
          <option value="">Propiedades y vehículos</option>
          {CATEGORIES.map((c) => (
            <optgroup key={c} label={CATEGORY_LABEL[c]}>
              <option value={`cat:${c}`}>Todos los {CATEGORY_LABEL[c].toLowerCase()}</option>
              {typesOf(c).map((t) => <option key={t} value={t}>{TYPE_PLURAL[t]}</option>)}
            </optgroup>
          ))}
        </select>
        {/* Si la operación no aplica a la categoría (p. ej. preventa de vehículos), el catálogo la ignora. */}
        <Link href={searchPath({ category, operation: op, q: q.trim().slice(0, 80) || undefined, types })} className="btn btn-primary" style={{ flex: "0 0 auto", height: 44, padding: "0 20px", fontSize: 15 }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 17 }} />Buscar
        </Link>
      </div>
    </div>
  );
}
