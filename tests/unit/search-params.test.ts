// Los query params de /propiedades llegan de cualquiera: deben quedar acotados a listas cerradas
// antes de tocar la base o la caché (cada combinación distinta es una entrada de caché).
import { describe, expect, it } from "vitest";
import { activeFilterCount, EMPTY_FILTERS, parseSearchParams, toQueryString } from "@/lib/search-params";

const AMENITIES = ["Piscina", "Jardín", "Seguridad 24h"];

describe("parseSearchParams", () => {
  it("sin parámetros devuelve los filtros vacíos", () => {
    expect(parseSearchParams({})).toEqual(EMPTY_FILTERS);
  });

  it("acepta valores válidos", () => {
    const f = parseSearchParams(
      { op: "Venta", tipo: "Casa,Apartamento", canton: "Paraíso", pmin: "1000", pmax: "5000", hab: "3", banos: "2", parqueos: "1", amin: "50", amax: "300", amen: "Piscina", q: "Orosi", orden: "precio_asc", guardadas: "1", pagina: "2" },
      AMENITIES,
    );
    expect(f).toMatchObject({
      operation: "Venta", types: ["Apartamento", "Casa"], cantons: ["Paraíso"], priceMin: 1000, priceMax: 5000,
      bedrooms: 3, bathrooms: 2, parking: 1, areaMin: 50, areaMax: 300, amenities: ["Piscina"], q: "Orosi",
      sort: "precio_asc", saved: true, page: 2,
    });
  });

  it("ignora valores fuera de las listas cerradas", () => {
    const f = parseSearchParams(
      { op: "'; drop table properties;--", tipo: "Castillo,<script>", canton: "Narnia", orden: "random()", amen: "Helipuerto", guardadas: "true" },
      AMENITIES,
    );
    expect(f.operation).toBe("Todas");
    expect(f.types).toEqual([]);
    expect(f.cantons).toEqual([]);
    expect(f.sort).toBe("recientes");
    expect(f.amenities).toEqual([]);
    expect(f.saved).toBe(false);
  });

  it("quita duplicados y ordena según la lista permitida (una sola clave de caché)", () => {
    const a = parseSearchParams({ tipo: "Casa,Apartamento,Casa" });
    const b = parseSearchParams({ tipo: "Apartamento,Casa" });
    expect(a.types).toEqual(b.types);
    expect(toQueryString(a)).toBe(toQueryString(b));
  });

  it("acota números: negativos, NaN, decimales e infinitos", () => {
    const f = parseSearchParams({ pmin: "-5", pmax: "abc", hab: "99", banos: "2.9", parqueos: "Infinity", pagina: "100000" });
    expect(f.priceMin).toBeUndefined();
    expect(f.priceMax).toBeUndefined();
    expect(f.bedrooms).toBe(10);
    expect(f.bathrooms).toBe(2);
    expect(f.parking).toBe(0);
    expect(f.page).toBe(50);
  });

  it("acota precios y áreas enormes", () => {
    const f = parseSearchParams({ pmax: "1e20", amax: "1e20" });
    expect(f.priceMax).toBe(1e12);
    expect(f.areaMax).toBe(1e7);
  });

  it("intercambia mínimo y máximo invertidos", () => {
    const f = parseSearchParams({ pmin: "900", pmax: "100", amin: "500", amax: "20" });
    expect([f.priceMin, f.priceMax]).toEqual([100, 900]);
    expect([f.areaMin, f.areaMax]).toEqual([20, 500]);
  });

  it("recorta el texto libre a 80 caracteres y descarta el vacío", () => {
    expect(parseSearchParams({ q: "x".repeat(500) }).q).toHaveLength(80);
    expect(parseSearchParams({ q: "   " }).q).toBeUndefined();
  });

  it("con parámetros repetidos usa solo el primero", () => {
    expect(parseSearchParams({ op: ["Alquiler", "Venta"] }).operation).toBe("Alquiler");
  });
});

describe("toQueryString", () => {
  it("omite los valores por defecto", () => {
    expect(toQueryString(EMPTY_FILTERS)).toBe("");
  });

  it("ida y vuelta: parse(toQueryString(f)) === f", () => {
    const f = parseSearchParams({ op: "Alquiler", tipo: "Casa", canton: "Cartago", pmax: "800000", hab: "2", amen: "Jardín", q: "centro", orden: "destacadas", pagina: "3" }, AMENITIES);
    const back = parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(f))), AMENITIES);
    expect(back).toEqual(f);
  });

  it("codifica el texto libre (no inyecta parámetros)", () => {
    const qs = toQueryString({ q: "a&op=Venta#x" });
    expect(new URLSearchParams(qs).get("op")).toBeNull();
    expect(new URLSearchParams(qs).get("q")).toBe("a&op=Venta#x");
  });
});

describe("activeFilterCount", () => {
  it("cuenta cada grupo de filtros una vez", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, operation: "Venta", types: ["Casa", "Apartamento"], priceMin: 1, priceMax: 2 })).toBe(3);
  });
});
