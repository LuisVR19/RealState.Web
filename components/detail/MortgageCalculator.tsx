"use client";

import { useState } from "react";
import { crc, decimal, monthlyPayment, shortCrc, waLink } from "@/lib/format";
import type { Agent, PropertySummary } from "@/lib/types";

/** Calculadora de cuota referencial (solo cálculo en el navegador). */
export function MortgageCalculator({ property: p, agent: a }: { property: PropertySummary; agent: Agent }) {
  const [down, setDown] = useState(20);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(9);
  const { loan, monthly } = monthlyPayment(p.price, down, years, rate);
  const wa = waLink(a, `Hola ${a.firstName}, me interesa "${p.title}" (${p.code}). Quisiera una preaprobación con ${down}% de prima a ${years} años.`);
  const row = (label: string, value: string, input: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--color-neutral-400)" }}>{label}</span><span>{value}</span></div>
      {input}
    </div>
  );
  return (
    <section className="calc">
      <div><h2 className="h2-20" style={{ margin: "0 0 4px" }}>Calcula tu cuota</h2><span style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>Estimación referencial en colones. Tu asesor te conecta con bancos para una preaprobación.</span></div>
      <div className="calc-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {row("Prima", `${down}% · ${shortCrc((p.price * down) / 100)}`, <input type="range" min={10} max={50} step={5} value={down} onChange={(e) => setDown(+e.target.value)} />)}
          {row("Plazo", `${years} años`, <input type="range" min={10} max={30} step={5} value={years} onChange={(e) => setYears(+e.target.value)} />)}
          {row("Tasa anual", decimal(+rate.toFixed(2)) + "%", <input type="range" min={6} max={13} step={0.25} value={rate} onChange={(e) => setRate(+e.target.value)} />)}
        </div>
        <div className="calc-result">
          <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>Cuota mensual estimada</span>
          <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>{crc(monthly)}</span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>Monto a financiar: {crc(loan)}</span>
          <a className="btn btn-primary" href={wa} target="_blank" rel="noopener" style={{ marginTop: 6, height: 40 }}><i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} />Pedir preaprobación</a>
        </div>
      </div>
    </section>
  );
}
