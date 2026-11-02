"use client";

import { useEffect, useState, useTransition } from "react";
import { requestVisit } from "@/app/actions";
import { COMPANY } from "@/lib/legal";
import { isValidPhone, nextVisitDays, normalizePhone, VISIT_TIMES, waLink } from "@/lib/format";
import type { Agent, PropertySummary, VisitMode } from "@/lib/types";
import { useUI } from "./ui-provider";

/** Agendador de visitas (día, hora y modalidad). Envía la solicitud con la Server Action requestVisit. */
export function VisitScheduler({ agent, property, radioName }: { agent: Agent; property?: PropertySummary | null; radioName: string }) {
  const { account } = useUI();
  // Las fechas dependen del reloj: se calculan en el navegador, no durante el prerender del servidor.
  const [days, setDays] = useState<ReturnType<typeof nextVisitDays>>([]);
  useEffect(() => setDays(nextVisitDays()), []);
  // Con sesión de cliente se precarga su nombre (la base usa de todos modos el de su cuenta).
  const accountName = account?.kind === "client" ? account.name : "";
  useEffect(() => {
    if (accountName) setName((n) => n || accountName);
  }, [accountName]);
  const [mode, setMode] = useState<VisitMode>("Presencial");
  const [day, setDay] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filled = !!(days.length && time && name.trim().length >= 2 && isValidPhone(normalizePhone(phone)));
  const ready = filled && consent;
  const hint = error ?? (!time ? "Elige una hora para continuar" : !filled ? "Completa tu nombre y un WhatsApp de 8 dígitos" : !consent ? "Acepta la política de privacidad para enviar" : "Listo para enviar");
  const d = days[day] ?? { iso: "", dow: "", num: 0, mon: "" };

  const submit = () => {
    if (!ready || !time || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await requestVisit({
        propertyId: property?.id ?? null,
        agentId: agent.isTeam ? null : agent.id,
        date: d.iso,
        time,
        mode,
        name,
        phone,
        consent,
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  };

  if (done) {
    const summary = `${d.dow} ${d.num} ${d.mon} · ${time} · ${mode}`;
    const wa = waLink(agent, `Hola ${agent.firstName}, soy ${name}. Acabo de solicitar ${property ? `una visita a "${property.title}" (${property.code})` : "una reunión"} para el ${summary}.`);
    return (
      <div className="sched-done">
        <i className="ph ph-check-circle" style={{ fontSize: 34, color: "var(--color-accent)" }} />
        <div style={{ fontSize: 18, fontWeight: 500 }}>Visita solicitada</div>
        <div className="sched-summary"><i className="ph ph-calendar-blank" style={{ fontSize: 16 }} />{summary}</div>
        <p className="sched-note">{agent.firstName} te escribirá por WhatsApp para confirmar la cita y enviarte la ubicación exacta. Si necesitas cambiar algo, respóndele en el mismo chat.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn btn-primary" href={wa} target="_blank" rel="noopener" style={{ flex: 1, height: 40 }}><i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} />Abrir WhatsApp</a>
          <button className="btn btn-secondary" onClick={() => setDone(false)} style={{ height: 40 }}>Cambiar horario</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sched">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{property ? "Agenda una visita" : "Agenda una reunión"}</div>
        <div className="muted-12">Sin costo. {agent.firstName} confirma por WhatsApp.</div>
      </div>
      <div className="seg" style={{ display: "flex", width: "100%" }}>
        {([["Presencial", "ph-map-pin"], ["Videollamada", "ph-video-camera"]] as const).map(([m, ic]) => (
          <label key={m} className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name={radioName} checked={mode === m} onChange={() => setMode(m)} />
            <i className={`ph ${ic}`} style={{ fontSize: 15 }} />{m}
          </label>
        ))}
      </div>
      <div className="sched-block">
        <div className="muted-12">Día</div>
        <div className="sched-days">
          {days.map((x, i) => (
            <button key={x.iso} type="button" onClick={() => setDay(i)} className={`chip sched-day${day === i ? " is-on" : ""}`}>
              <span style={{ fontSize: 11 }}>{x.dow}</span>
              <span style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.1 }}>{x.num}</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>{x.mon}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sched-block">
        <div className="muted-12">Hora</div>
        <div className="sched-times">
          {VISIT_TIMES.map((t) => (
            <button key={t} type="button" onClick={() => setTime(t)} className={`chip sched-time${time === t ? " is-on" : ""}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid-auto-140">
        <div className="field"><label>Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={120} autoComplete="name" /></div>
        <div className="field"><label>WhatsApp</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888 8888" maxLength={16} autoComplete="tel" /></div>
      </div>
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Autorizo a {COMPANY.tradeName} a usar mi nombre y WhatsApp para coordinar esta visita, según la <a href="/politica-de-privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span>
      </label>
      <button className="btn btn-primary" disabled={!ready || pending} onClick={submit} style={{ width: "100%", height: 42, fontSize: 15 }}>
        <i className="ph ph-calendar-check" style={{ fontSize: 17 }} />{pending ? "Enviando…" : "Solicitar visita"}
      </button>
      <div role={error ? "alert" : undefined} style={{ fontSize: 11, color: error ? "#8a2f24" : "var(--color-neutral-500)", textAlign: "center" }}>{hint}</div>
    </div>
  );
}
