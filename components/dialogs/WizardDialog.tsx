"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { amenityIcon, CANTONS, OP_LABEL, pricePresetsFor, shortCrc, TYPES, TYPE_ICON, TYPE_PLURAL } from "@/lib/format";
import { searchPath } from "@/lib/routes";
import { EMPTY_FILTERS } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/client";
import type { Amenity, Canton, Operation, PropertyType, SearchFilters } from "@/lib/types";
import { Chip, ChipGroup, toggle } from "../Chip";
import { useUI } from "../ui-provider";

type Op = Operation | "Todas";
const OP_ICON: Record<Op, string> = { Venta: "ph-key", Alquiler: "ph-calendar", Vacacional: "ph-sun", Preventa: "ph-crane", Todas: "ph-circles-four" };
const toAmount = (s: string) => {
  const n = Number(s.replace(/\D/g, ""));
  return n > 0 ? n : undefined;
};

/** Búsqueda personalizada paso a paso. Cuenta coincidencias reales y lleva al listado filtrado. */
export function WizardDialog() {
  const { close, account, amenities, totalProperties } = useUI();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [op, setOp] = useState<Op>("Venta");
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [cantons, setCantons] = useState<Canton[]>([]);
  const [beds, setBeds] = useState(0);
  const [baths, setBaths] = useState(0);
  const [park, setPark] = useState(0);
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [amen, setAmen] = useState<Amenity[]>([]);
  const [save, setSave] = useState(true);
  const [count, setCount] = useState<number | null>(totalProperties);
  const [busy, setBusy] = useState(false);

  const isRes = !types.length || types.some((t) => t === "Casa" || t === "Apartamento");
  const presets = pricePresetsFor(op);
  const pMin = toAmount(priceMin), pMax = toAmount(priceMax);

  const filters: SearchFilters = useMemo(
    () => ({
      ...EMPTY_FILTERS,
      operation: op,
      types,
      cantons,
      bedrooms: isRes ? beds : 0,
      bathrooms: isRes ? baths : 0,
      parking: park,
      areaMin: toAmount(areaMin),
      areaMax: toAmount(areaMax),
      priceMin: pMin,
      priceMax: pMax,
      amenities: amen,
    }),
    [op, types, cantons, beds, baths, park, areaMin, areaMax, pMin, pMax, amen, isRes],
  );

  // Conteo real (search_properties con límite 1 devuelve total_count). Con espera para no consultar en cada tecla.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await createClient().rpc("search_properties", {
        p_operation: filters.operation === "Todas" ? undefined : filters.operation,
        p_types: filters.types.length ? filters.types : undefined,
        p_cantons: filters.cantons.length ? filters.cantons : undefined,
        p_price_min: filters.priceMin,
        p_price_max: filters.priceMax,
        p_min_bedrooms: filters.bedrooms || undefined,
        p_min_bathrooms: filters.bathrooms || undefined,
        p_min_parking: filters.parking || undefined,
        p_min_area_m2: filters.areaMin,
        p_max_area_m2: filters.areaMax,
        p_amenities: filters.amenities.length ? amenities.filter((a) => filters.amenities.includes(a.name)).map((a) => a.id) : undefined,
        p_limit: 1,
      });
      if (!cancelled) setCount(error ? null : Number(data?.[0]?.total_count ?? 0));
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [filters, amenities]);

  const steps = [
    { title: "¿Qué estás buscando?", sub: "Elige la operación y uno o varios tipos de propiedad." },
    { title: "¿Dónde te gustaría vivir o invertir?", sub: "Puedes marcar varios cantones. Si no marcas ninguno, buscamos en toda la provincia." },
    { title: "¿Cuánto espacio necesitas?", sub: "Habitaciones, baños, parqueos y metros cuadrados." },
    { title: "¿Cuál es tu presupuesto?", sub: op === "Alquiler" ? "Monto mensual en colones." : op === "Vacacional" ? "Monto por noche en colones." : "Precio total en colones." },
    { title: "¿Algo imprescindible?", sub: "Solo mostraremos propiedades que tengan todo lo que marques." },
  ];
  const S = steps[step];
  const last = step === steps.length - 1;
  const budget = pMin || pMax ? `${pMin ? shortCrc(pMin) : "₡0"} – ${pMax ? shortCrc(pMax) : "sin tope"}` : null;
  const summary = [op === "Todas" ? "Cualquier operación" : OP_LABEL[op]].concat(
    types.length ? types.map((t) => TYPE_PLURAL[t]) : ["Cualquier tipo"],
    cantons.length ? cantons : ["Toda la provincia"],
    filters.bedrooms ? [filters.bedrooms + "+ hab."] : [],
    filters.bathrooms ? [filters.bathrooms + "+ baños"] : [],
    park ? [park + "+ parqueos"] : [],
    budget ? [budget] : [],
    amen,
  );
  const canSave = account?.kind === "client";

  const finish = async () => {
    setBusy(true);
    if (canSave && save && account.clientId) {
      const supabase = createClient();
      // El asistente no edita las notas: se leen y reenvían para no borrarlas (la RPC reemplaza todo).
      const current = await supabase.from("client_preferences").select("notes").eq("client_id", account.clientId).maybeSingle();
      const { error } = current.error ? current : await supabase.rpc("save_my_preferences", {
        p_operation: op,
        p_property_types: types,
        p_cantons: cantons,
        p_budget_min: pMin,
        p_budget_max: pMax,
        p_min_bedrooms: filters.bedrooms,
        p_min_bathrooms: filters.bathrooms,
        p_min_parking: park,
        p_min_area_m2: filters.areaMin,
        p_max_area_m2: filters.areaMax,
        p_amenity_ids: amenities.filter((a) => amen.includes(a.name)).map((a) => a.id),
        p_notes: current.data?.notes ?? undefined,
      });
      if (error) console.error("[asistente] preferencias:", error.message);
    }
    close();
    router.push(searchPath(filters));
  };

  const nChips = (val: number, set: (n: number) => void, arr: number[], icon: string) =>
    arr.map((n) => <Chip key={n} size="lg" label={n ? n + "+" : "Cualquiera"} icon={icon} on={val === n} onClick={() => set(n)} />);
  const countLabel = count === null ? "" : `${count} ${count === 1 ? "propiedad coincide" : "propiedades coinciden"}`;

  return (
    <div className="dialog-backdrop z-dialog" onClick={close}>
      <div className="dialog wiz" onClick={(e) => e.stopPropagation()}>
        <div className="wiz-head">
          <div className="dialog-head">
            <div className="dialog-head-text">
              <span className="eyebrow" style={{ letterSpacing: ".1em" }}>Paso {step + 1} de {steps.length}</span>
              <span className="dialog-title" style={{ fontSize: 21 }}>{S.title}</span>
              <span className="dialog-sub">{S.sub}</span>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
          </div>
          <div className="wiz-bars">
            {steps.map((x, i) => (
              <button key={i} onClick={() => setStep(i)} title={x.title} aria-label={x.title} style={{ background: i <= step ? "var(--color-accent)" : "var(--color-neutral-800)" }} />
            ))}
          </div>
        </div>
        <div className="wiz-body">
          {step === 0 && (
            <>
              <ChipGroup title="Operación">
                {(["Venta", "Alquiler", "Vacacional", "Preventa", "Todas"] as Op[]).map((k) => (
                  <Chip key={k} size="lg" label={k === "Todas" ? "Cualquiera" : OP_LABEL[k]} icon={OP_ICON[k]} on={op === k} onClick={() => setOp(k)} />
                ))}
              </ChipGroup>
              <ChipGroup title="Tipo de propiedad">
                {TYPES.map((t) => <Chip key={t} size="lg" label={TYPE_PLURAL[t]} icon={TYPE_ICON[t]} on={types.includes(t)} onClick={() => setTypes(toggle(types, t))} />)}
              </ChipGroup>
            </>
          )}
          {step === 1 && (
            <ChipGroup title="Cantones de Cartago">
              {CANTONS.map((c) => <Chip key={c} size="lg" label={c} icon="ph-map-pin" on={cantons.includes(c)} onClick={() => setCantons(toggle(cantons, c))} />)}
            </ChipGroup>
          )}
          {step === 2 && (
            <>
              {isRes && <ChipGroup title="Habitaciones">{nChips(beds, setBeds, [0, 1, 2, 3, 4], "ph-bed")}</ChipGroup>}
              {isRes && <ChipGroup title="Baños">{nChips(baths, setBaths, [0, 1, 2, 3], "ph-bathtub")}</ChipGroup>}
              <ChipGroup title="Parqueos">{nChips(park, setPark, [0, 1, 2, 3], "ph-car")}</ChipGroup>
              <div className="chip-group">
                <span className="chip-group-title">Espacio de construcción o terreno (m²)</span>
                <div className="grid-2">
                  <div className="field"><label htmlFor="wiz-amin">Mínimo</label><input id="wiz-amin" className="input input-42" inputMode="numeric" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} placeholder="Ej. 90" /></div>
                  <div className="field"><label htmlFor="wiz-amax">Máximo</label><input id="wiz-amax" className="input input-42" inputMode="numeric" value={areaMax} onChange={(e) => setAreaMax(e.target.value)} placeholder="Sin límite" /></div>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <ChipGroup title="Rangos frecuentes">
                {presets.map((p) => {
                  const on = pMin === p.min && pMax === p.max;
                  return (
                    <Chip key={p.label} size="lg" label={p.label} icon="ph-coins" on={on}
                      onClick={() => { setPriceMin(on || !p.min ? "" : String(p.min)); setPriceMax(on || !p.max ? "" : String(p.max)); }} />
                  );
                })}
              </ChipGroup>
              <div className="grid-2">
                <div className="field"><label htmlFor="wiz-pmin">Mínimo (₡)</label><input id="wiz-pmin" className="input input-42" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" /></div>
                <div className="field"><label htmlFor="wiz-pmax">Máximo (₡)</label><input id="wiz-pmax" className="input input-42" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Sin límite" /></div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <ChipGroup title="Amenidades">
                {amenities.map((a) => <Chip key={a.id} size="lg" label={a.name} icon={amenityIcon(a.name)} on={amen.includes(a.name)} onClick={() => setAmen(toggle(amen, a.name))} />)}
              </ChipGroup>
              <div className="wiz-summary">
                <span style={{ fontSize: 13, fontWeight: 500 }}>Tu búsqueda</span>
                <div className="chip-row">{summary.map((s) => <span key={s} className="tag tag-accent">{s}</span>)}</div>
                {canSave && (
                  <label className="check-label" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={save} onChange={() => setSave(!save)} />Guardar como mis preferencias para recibir coincidencias
                  </label>
                )}
              </div>
            </>
          )}
        </div>
        <div className="wiz-foot">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}><i className="ph ph-arrow-left" style={{ fontSize: 15 }} />Atrás</button>}
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--color-neutral-400)" }} aria-live="polite">{countLabel}</span>
          {!last ? (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(step + 1)} style={{ height: 42 }}>Omitir</button>
              <button className="btn btn-primary" onClick={() => setStep(step + 1)} style={{ height: 42, padding: "0 18px" }}>Siguiente<i className="ph ph-arrow-right" style={{ fontSize: 15 }} /></button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={busy} style={{ height: 42, padding: "0 18px" }}>
              <i className="ph ph-magnifying-glass" style={{ fontSize: 16 }} />Ver {count ?? ""} propiedades
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
