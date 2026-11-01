// Contacto general del sitio a partir del dueño del negocio (lib/team.ts).
import { describe, expect, it } from "vitest";
import { siteContactFrom } from "@/lib/team";

const owner = { phone: "88881234", contact_hours: "Todos los días, 7:00 a 20:00", contact_location: "Cartago centro" };

describe("siteContactFrom", () => {
  it("usa el teléfono, horario y ubicación del dueño", () => {
    const c = siteContactFrom(owner);
    expect(c).toMatchObject({ phone: "+506 8888 1234", whatsapp: "50688881234", hours: "Todos los días, 7:00 a 20:00", location: "Cartago centro" });
    expect(c.team).toMatchObject({ isTeam: true, whatsapp: "50688881234", phone: "+506 8888 1234" });
  });

  it("sin dueño en la base usa los valores de respaldo", () => {
    expect(siteContactFrom(null)).toMatchObject({ phone: "+506 4000 2400", whatsapp: "50640002400", hours: "Lunes a sábado, 8:00 a 18:00", location: "Paraíso, Cartago, Costa Rica" });
  });

  it("completa con respaldo lo que el dueño dejó vacío", () => {
    const c = siteContactFrom({ phone: "88881234", contact_hours: "  ", contact_location: null });
    expect(c.whatsapp).toBe("50688881234");
    expect(c.hours).toBe("Lunes a sábado, 8:00 a 18:00");
    expect(c.location).toBe("Paraíso, Cartago, Costa Rica");
  });

  it("un teléfono inválido no rompe los enlaces de WhatsApp", () => {
    expect(siteContactFrom({ ...owner, phone: "123" }).whatsapp).toBe("50640002400");
    expect(siteContactFrom({ ...owner, phone: null }).whatsapp).toBe("50640002400");
  });
});
