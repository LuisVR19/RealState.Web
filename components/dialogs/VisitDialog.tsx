"use client";

import { crc, pricePeriod, waProperty } from "@/lib/format";
import { img } from "@/lib/img";
import type { Agent, PropertySummary } from "@/lib/types";
import { useUI } from "../ui-provider";
import { VisitScheduler } from "../VisitScheduler";

export function VisitDialog({ agent, property }: { agent: Agent; property?: PropertySummary | null }) {
  const { close } = useUI();
  return (
    <div className="dialog-backdrop z-visit" onClick={close}>
      <div className="dialog" data-property={property?.id} onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", gap: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="avatar avatar-44">{agent.initials}</span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{agent.name}</span>
            <span className="muted-12">Responde en {agent.responseTime}</span>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
        </div>
        {property && (
          <div className="visit-prop">
            <div className="visit-prop-img"><img src={img(property.images[0], 400)} alt="" /></div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, lineHeight: 1.3 }}>{property.title}</span>
              <span style={{ fontSize: 13, color: "var(--color-accent-300)" }}>{crc(property.price)} {pricePeriod(property)}</span>
            </div>
          </div>
        )}
        <VisitScheduler agent={agent} property={property} radioName="modal" />
        <a className="btn btn-ghost" href={waProperty(agent, property)} target="_blank" rel="noopener" style={{ alignSelf: "center" }}>
          <i className="ph ph-whatsapp-logo" style={{ fontSize: 16 }} />Prefiero escribir por WhatsApp
        </a>
      </div>
    </div>
  );
}
