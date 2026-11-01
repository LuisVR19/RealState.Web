"use client";

import type { Agent, PropertySummary } from "@/lib/types";
import { waProperty } from "@/lib/format";
import { useUI } from "../ui-provider";

/** Barra fija de contacto en celular y tablet (menos de 1024px). */
export function BottomBar({ property, agent, priceShort }: { property: PropertySummary; agent: Agent; priceShort: string }) {
  const { open } = useUI();
  return (
    <div className="bottom-bar">
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 16, fontWeight: 500, whiteSpace: "nowrap" }}>{priceShort}</span>
        <span style={{ fontSize: 11, color: "var(--color-neutral-400)" }}>{agent.firstName} · responde en {agent.responseTime}</span>
      </div>
      <a className="btn btn-secondary btn-icon" href={waProperty(agent, property)} target="_blank" rel="noopener" aria-label="WhatsApp" style={{ width: 44, height: 44 }}><i className="ph ph-whatsapp-logo" style={{ fontSize: 20 }} /></a>
      <button className="btn btn-primary" onClick={() => open({ type: "visit", agent, property })} style={{ height: 44, padding: "0 16px" }}><i className="ph ph-calendar-check" style={{ fontSize: 17 }} />Agendar visita</button>
    </div>
  );
}
