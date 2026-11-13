import { describe, expect, it } from "vitest";
import { categoryOf, crc, formatPhone, isValidPhone, matchTypesOf, monthlyPayment, normalizePhone, operationsOf, priceLine, shortCrc } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

describe("teléfonos de Costa Rica", () => {
  it.each([
    ["8888-7777", "88887777"],
    ["+506 8888 7777", "88887777"],
    ["(506) 2222-3333", "22223333"],
    ["50688887777", "88887777"],
    ["40612345678", "40612345678"], // 11 dígitos sin el 506 inicial: se deja tal cual (y no valida)
  ])("normalizePhone(%s) = %s", (input, out) => {
    expect(normalizePhone(input)).toBe(out);
  });

  it.each(["22223333", "44445555", "60001111", "70001111", "88887777"])("acepta %s", (p) => {
    expect(isValidPhone(p)).toBe(true);
  });

  it.each(["12345678", "9999999", "888877776", "3333444x", "", "1234"])("rechaza %s", (p) => {
    expect(isValidPhone(p)).toBe(false);
  });

  it("formatPhone agrega el código de país", () => {
    expect(formatPhone("88887777")).toBe("+506 8888 7777");
  });
});

describe("montos", () => {
  it("crc usa punto como separador de miles", () => {
    expect(crc(95000000)).toBe("₡95.000.000");
    expect(crc(0)).toBe("₡0");
  });

  it("shortCrc resume millones", () => {
    expect(shortCrc(95_000_000)).toMatch(/95/);
  });

  it("monthlyPayment calcula la cuota de un préstamo a tasa fija", () => {
    const { loan, monthly } = monthlyPayment(100_000_000, 20, 30, 8);
    expect(loan).toBe(80_000_000);
    // Referencia: 733,76 por cada 100 000 a 8 % y 30 años → 80 M × 0,0073376 ≈ 587 012.
    expect(Math.round(monthly)).toBe(587_012);
  });
});

describe("servicios: categoría y precio", () => {
  const base: PropertySummary = { id: "1", code: "ISF-0001", title: "x", category: "Servicio", operation: "Servicio", type: "Diseño web", featured: false, canton: "Cartago", zone: "Centro", lat: 0, lng: 0, price: 150000, bedrooms: 0, bathrooms: 0, areaM2: 0, parkingSpaces: 0, agentId: "a", images: [], daysPublished: 0 };

  it("categoryOf reconoce los tipos de servicio", () => {
    expect(categoryOf("Diseño web")).toBe("Servicio");
    expect(categoryOf("Otro servicio")).toBe("Servicio");
    expect(categoryOf("Carro")).toBe("Vehículo");
    expect(categoryOf("Casa")).toBe("Inmueble");
  });

  it("los servicios solo tienen la operación Servicio y no entran en las operaciones generales", () => {
    expect(operationsOf("Servicio")).toEqual(["Servicio"]);
    expect(operationsOf(null)).not.toContain("Servicio");
    expect(matchTypesOf(null)).not.toContain("Diseño web");
  });

  it.each([
    ["Por proyecto", "Desde ₡150.000"],
    ["Por hora", "₡150.000/hora"],
    ["Precio fijo", "₡150.000"],
    ["A convenir", "A convenir"],
  ] as const)("priceLine con cobro %s = %s", (serviceRate, out) => {
    expect(priceLine({ ...base, serviceRate })).toBe(out);
  });

  it("un inmueble en venta no muestra periodo y uno en alquiler sí", () => {
    expect(priceLine({ ...base, category: "Inmueble", type: "Casa", operation: "Venta", price: 1000 })).toBe("₡1.000");
    expect(priceLine({ ...base, category: "Inmueble", type: "Casa", operation: "Alquiler", price: 1000 })).toBe("₡1.000/mes");
  });
});
