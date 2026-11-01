"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CANTONS, dots, OP_LABEL, TYPES, TYPE_PLURAL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Amenity, Canton, Operation, PropertyType } from "@/lib/types";
import { Chip, ChipGroup, toggle } from "../Chip";
import { useUI } from "../ui-provider";

type Op = Operation | "Todas";

const toAmount = (s: string) => {
  const n = Number(s.replace(/\D/g, ""));
  return n > 0 ? n : undefined;
};

/** Preferencias del cliente: se leen de `client_preferences` y se guardan con rpc save_my_preferences. */
export function PreferencesDialog({ welcome }: { welcome?: boolean }) {
  const { close, account, amenities, refreshAccount, open } = useUI();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [op, setOp] = useState<Op>("Todas");
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [cantons, setCantons] = useState<Canton[]>([]);
  const [beds, setBeds] = useState(0);
  const [baths, setBaths] = useState(0);
  const [amen, setAmen] = useState<Amenity[]>([]);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState(false);
  // Campos que este diálogo no muestra (los fija el asistente): se reenvían tal cual para no borrarlos.
  const [kept, setKept] = useState<{ minParking?: number; minArea?: number; maxArea?: number }>({});
  const budgetTitle = op === "Alquiler" ? "Presupuesto mensual" : op === "Vacacional" ? "Presupuesto por noche" : "Presupuesto";
  const clientId = account?.kind === "client" ? account.clientId : null;

  useEffect(() => {
    if (account === null) open({ type: "auth", mode: "login" });
  }, [account, open]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("client_preferences").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("client_required_amenities").select("amenities(name)").eq("client_id", clientId),
    ])
      .then(([prefs, req]) => {
      if (cancelled) return;
      if (prefs.error || req.error) {
        console.error("[preferencias]", prefs.error?.message ?? req.error?.message);
        return setLoadError(true); // Sin datos fiables no se permite guardar (sobrescribiría las preferencias).
      }
      const p = prefs.data;
      if (p) {
        setOp(p.operation ?? "Todas");
        setTypes(p.property_types);
        setCantons(p.cantons);
        setBeds(p.min_bedrooms ?? 0);
        setBaths(Number(p.min_bathrooms ?? 0));
        setMin(p.budget_min ? dots(p.budget_min) : "");
        setMax(p.budget_max ? dots(p.budget_max) : "");
        setNotes(p.notes ?? "");
        setKept({ minParking: p.min_parking ?? undefined, minArea: p.min_area_m2 ?? undefined, maxArea: p.max_area_m2 ?? undefined });
      }
      setAmen((req.data ?? []).map((r) => (r.amenities as { name: string } | null)?.name).filter((n): n is string => !!n));
      setLoaded(true);
      })
      .catch((e) => {
        console.error("[preferencias]", e);
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [clientId]);

  const save = async () => {
    if (!clientId || saving) return;
    const budgetMin = toAmount(min), budgetMax = toAmount(max);
    if (budgetMin && budgetMax && budgetMin > budgetMax) return setError("El presupuesto mínimo no puede ser mayor que el máximo.");
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("save_my_preferences", {
      p_operation: op,
      p_property_types: types,
      p_cantons: cantons,
      p_budget_min: budgetMin,
      p_budget_max: budgetMax,
      p_min_bedrooms: beds,
      p_min_bathrooms: baths,
      p_min_parking: kept.minParking,
      p_min_area_m2: kept.minArea,
      p_max_area_m2: kept.maxArea,
      p_amenity_ids: amenities.filter((a) => amen.includes(a.name)).map((a) => a.id),
      p_notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (error) {
      console.error("[preferencias]", error.message);
      return setError("No pudimos guardar tus preferencias. Intenta de nuevo.");
    }
    await refreshAccount();
    close();
    router.push("/para-ti");
    router.refresh();
  };

  if (account && account.kind !== "client") {
    return (
      <div className="dialog-backdrop z-dialog" onClick={close}>
        <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,100%)", gap: 14, padding: 22 }}>
          <span className="dialog-title">Preferencias de cliente</span>
          <span className="dialog-sub">Tu cuenta es del equipo. Las preferencias de los clientes se gestionan desde el panel de asesores.</span>
          <button className="btn btn-primary" onClick={close} style={{ height: 40 }}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop z-dialog" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(640px,100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", gap: 20, padding: 22 }}>
        <div className="dialog-head">
          <div className="dialog-head-text">
            <span className="dialog-title">{welcome ? "¿Qué estás buscando?" : "Mis preferencias"}</span>
            <span className="dialog-sub">{welcome ? "Tu cuenta está lista. Cuéntanos qué buscas y te mostramos las propiedades que coinciden." : "Actualiza lo que buscas. Tu asesor verá los cambios de inmediato."}</span>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
        </div>
        {loadError ? (
          <span role="alert" style={{ padding: "24px 0", textAlign: "center", fontSize: 14, color: "#8a2f24" }}>No pudimos cargar tus preferencias. Cierra y vuelve a intentarlo.</span>
        ) : !loaded ? (
          <span className="muted-14" style={{ padding: "24px 0", textAlign: "center" }}>Cargando tus preferencias…</span>
        ) : (
          <>
            <ChipGroup title="Operación" strong>
              {(["Venta", "Alquiler", "Vacacional", "Preventa", "Todas"] as Op[]).map((k) => <Chip key={k} size="md" label={k === "Todas" ? "Cualquiera" : OP_LABEL[k]} on={op === k} onClick={() => setOp(k)} />)}
            </ChipGroup>
            <ChipGroup title="Tipo de propiedad" strong>
              {TYPES.map((t) => <Chip key={t} size="md" label={TYPE_PLURAL[t]} on={types.includes(t)} onClick={() => setTypes(toggle(types, t))} />)}
            </ChipGroup>
            <ChipGroup title="Cantones de interés" strong>
              {CANTONS.map((c) => <Chip key={c} size="md" label={c} on={cantons.includes(c)} onClick={() => setCantons(toggle(cantons, c))} />)}
            </ChipGroup>
            <div className="chip-group">
              <span className="chip-group-title is-strong">{budgetTitle}</span>
              <div className="grid-2">
                <div className="field"><label htmlFor="pref-min">Mínimo (₡)</label><input id="pref-min" className="input" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => setMin(toAmount(min) ? dots(toAmount(min)!) : "")} placeholder="0" style={{ height: 40 }} /></div>
                <div className="field"><label htmlFor="pref-max">Máximo (₡)</label><input id="pref-max" className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => setMax(toAmount(max) ? dots(toAmount(max)!) : "")} placeholder="Sin tope" style={{ height: 40 }} /></div>
              </div>
            </div>
            <ChipGroup title="Habitaciones" strong>
              {[0, 1, 2, 3, 4].map((n) => <Chip key={n} size="md" label={n ? n + "+" : "Cualquiera"} on={beds === n} onClick={() => setBeds(n)} />)}
            </ChipGroup>
            <ChipGroup title="Baños" strong>
              {[0, 1, 2, 3].map((n) => <Chip key={n} size="md" label={n ? n + "+" : "Cualquiera"} on={baths === n} onClick={() => setBaths(n)} />)}
            </ChipGroup>
            <ChipGroup title="Imprescindibles" strong>
              {amenities.map((a) => <Chip key={a.id} size="md" label={a.name} on={amen.includes(a.name)} onClick={() => setAmen(toggle(amen, a.name))} />)}
            </ChipGroup>
            <div className="field"><label htmlFor="pref-notes">Algo más que debamos saber</label><textarea id="pref-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Ej. necesito mudarme en enero, trabajo desde casa, tengo dos perros…" style={{ minHeight: 80 }} /></div>
            {error && <div role="alert" style={{ fontSize: 13, color: "#8a2f24" }}>{error}</div>}
          </>
        )}
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>{welcome ? "Más tarde" : "Cancelar"}</button>
          <button className="btn btn-primary" onClick={save} disabled={!loaded || loadError || saving} style={{ height: 40 }}>
            <i className="ph ph-sparkle" style={{ fontSize: 16 }} />{saving ? "Guardando…" : "Guardar y ver coincidencias"}
          </button>
        </div>
      </div>
    </div>
  );
}
