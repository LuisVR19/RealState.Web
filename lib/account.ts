// Datos PRIVADOS del cliente con sesión. Usa el cliente con cookies: la RLS limita cada
// consulta a las filas del propio cliente. Nunca se cachea entre usuarios.
import "server-only";
import { getPropertiesByIds } from "./data";
import { getAuthUser } from "./supabase/server";
import type { Client, PropertySummary, Visit } from "./types";

export interface ClientDashboard {
  client: Client;
  matches: { property: PropertySummary; score: number }[];
  visits: (Visit & { property: PropertySummary | null })[];
}

type Supabase = Awaited<ReturnType<typeof getAuthUser>>["supabase"];

async function loadClient(supabase: Supabase, userId: string): Promise<Client | null> {
  const { data: c, error } = await supabase
    .from("clients")
    .select(
      "id, name, email, phone, assigned_agent_id, status, " +
        "client_preferences(category, operation, property_types, cantons, budget_min, budget_max, min_bedrooms, min_bathrooms, min_parking, min_area_m2, max_area_m2, min_year, max_mileage_km, notes), " +
        "client_required_amenities(amenities(name))",
    )
    .eq("auth_user_id", userId)
    .maybeSingle<{
      id: string; name: string; email: string | null; phone: string | null; assigned_agent_id: string | null;
      status: Client["status"];
      client_preferences: {
        category: Client["preferences"]["category"]; min_year: number | null; max_mileage_km: number | null;
        operation: Client["preferences"]["operation"] | null; property_types: Client["preferences"]["propertyTypes"];
        cantons: Client["preferences"]["cantons"]; budget_min: number | null; budget_max: number | null;
        min_bedrooms: number | null; min_bathrooms: number | null; min_parking: number | null;
        min_area_m2: number | null; max_area_m2: number | null; notes: string | null;
      } | null;
      client_required_amenities: { amenities: { name: string } | null }[];
    }>();
  if (error) {
    console.error("[account] cliente:", error.message);
    throw new Error("No se pudo cargar tu cuenta");
  }
  if (!c) return null;
  const p = c.client_preferences;
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    assignedAgentId: c.assigned_agent_id,
    status: c.status,
    preferences: {
      category: p?.category ?? null,
      operation: p?.operation ?? "Todas",
      propertyTypes: p?.property_types ?? [],
      cantons: p?.cantons ?? [],
      budgetMin: p?.budget_min ?? undefined,
      budgetMax: p?.budget_max ?? undefined,
      minBedrooms: p?.min_bedrooms ?? 0,
      minBathrooms: Number(p?.min_bathrooms ?? 0),
      minParking: p?.min_parking ?? 0,
      minAreaM2: p?.min_area_m2 ?? undefined,
      maxAreaM2: p?.max_area_m2 ?? undefined,
      minYear: p?.min_year ?? undefined,
      maxMileageKm: p?.max_mileage_km ?? undefined,
      requiredAmenities: c.client_required_amenities.map((r) => r.amenities?.name).filter((n): n is string => !!n),
      notes: p?.notes ?? undefined,
    },
  };
}

/**
 * Panel "Para ti": cliente, coincidencias (get_client_matches, score >= 60) y visitas.
 * null si no hay sesión; `client: null` si la sesión no es de un cliente (p. ej. un asesor).
 */
export async function getClientDashboard(): Promise<{ signedIn: false } | { signedIn: true; data: ClientDashboard | null }> {
  const { supabase, userId } = await getAuthUser();
  if (!userId) return { signedIn: false };
  const client = await loadClient(supabase, userId);
  if (!client) return { signedIn: true, data: null };

  const [matchesRes, visitsRes] = await Promise.all([
    supabase.rpc("get_client_matches", { p_client_id: client.id }),
    supabase
      .from("visits")
      .select("id, property_id, agent_id, date, time, mode, status")
      .eq("client_id", client.id)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(50),
  ]);
  if (matchesRes.error) console.error("[account] coincidencias:", matchesRes.error.message);
  if (visitsRes.error) console.error("[account] visitas:", visitsRes.error.message);
  const scores = matchesRes.data ?? [];
  const visitRows = visitsRes.data ?? [];

  // Una sola consulta para las tarjetas de coincidencias y los títulos de las visitas.
  const ids = [...new Set([...scores.map((m) => m.property_id), ...visitRows.map((v) => v.property_id).filter((x): x is string => !!x)])];
  const byId = new Map((await getPropertiesByIds(ids)).map((p) => [p.id, p]));

  return {
    signedIn: true,
    data: {
      client,
      matches: scores.flatMap((m) => {
        const property = byId.get(m.property_id);
        return property ? [{ property, score: m.score }] : [];
      }),
      visits: visitRows.map((v) => ({
        id: v.id,
        propertyId: v.property_id,
        agentId: v.agent_id,
        date: v.date,
        time: v.time.slice(0, 5),
        mode: v.mode,
        status: v.status,
        property: v.property_id ? byId.get(v.property_id) ?? null : null,
      })),
    },
  };
}

/** Ids de las propiedades guardadas por el cliente con sesión (vacío si no hay sesión). */
export async function getFavoriteIds(): Promise<string[]> {
  const { supabase, userId } = await getAuthUser();
  if (!userId) return [];
  // Se filtra por el cliente propio: la RLS deja a asesores y admins leer favoritos de sus clientes.
  const { data: client } = await supabase.from("clients").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!client) return [];
  const { data, error } = await supabase.from("client_favorites").select("property_id").eq("client_id", client.id).limit(500);
  if (error) {
    console.error("[account] favoritos:", error.message);
    return [];
  }
  return data.map((f) => f.property_id);
}
