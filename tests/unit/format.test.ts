import { describe, expect, it } from "vitest";
import {
  categoryOf, crc, discountPct, effectivePrice, formatPhone, hasOffer, isValidPhone, matchTypesOf, monthlyPayment, normalizePhone, offerLabel,
  operationsOf, priceLine, priceMain, priceShortLabel, priceSuffix, priceText, priceWas, shortCrc,
} from "@/lib/format";
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

describe("oferta (precio con descuento)", () => {
  const casa: PropertySummary = {
    id: "1", code: "ISF-0001", title: "x", category: "Inmueble", operation: "Venta", type: "Casa", featured: false, canton: "Cartago",
    zone: "Centro", lat: 0, lng: 0, price: 100_000_000, bedrooms: 3, bathrooms: 2, areaM2: 200, parkingSpaces: 1, agentId: "a", images: [], daysPublished: 0,
  };
  const oferta = { ...casa, discountPrice: 85_000_000 };

  it("sin precio con descuento no hay oferta y todo queda igual", () => {
    expect(hasOffer(casa)).toBe(false);
    expect(effectivePrice(casa)).toBe(100_000_000);
    expect(priceWas(casa)).toBe("");
    expect(priceText(casa)).toBe(priceLine(casa));
    expect(discountPct(casa)).toBe(0);
  });

  it("con oferta muestra el precio con descuento y el original como 'antes'", () => {
    expect(hasOffer(oferta)).toBe(true);
    expect(effectivePrice(oferta)).toBe(85_000_000);
    expect(priceMain(oferta)).toBe("₡85.000.000");
    expect(priceShortLabel(oferta)).toBe("₡85 M");
    expect(priceWas(oferta)).toBe("₡100.000.000");
    expect(priceLine(oferta)).toBe("₡85.000.000");
    expect(priceText(oferta)).toBe("₡85.000.000 (antes ₡100.000.000)");
  });

  it("el precio por m² usa el precio con descuento", () => {
    expect(priceSuffix(oferta)).toBe(shortCrc(85_000_000 / 200) + "/m²");
  });

  it("alquiler: conserva el periodo", () => {
    const alquiler = { ...casa, operation: "Alquiler" as const, price: 500_000, discountPrice: 450_000 };
    expect(priceText(alquiler)).toBe("₡450.000/mes (antes ₡500.000)");
  });

  it("porcentaje redondeado y marca", () => {
    expect(discountPct(oferta)).toBe(15);
    expect(offerLabel(oferta)).toBe("Oferta −15 %");
    expect(offerLabel({ ...casa, discountPrice: 99_900_000 })).toBe("Oferta"); // 0,1 % redondea a 0
  });

  it("ignora descuentos inválidos (igual o mayor al precio, 0) y los servicios 'A convenir'", () => {
    expect(hasOffer({ ...casa, discountPrice: 100_000_000 })).toBe(false);
    expect(hasOffer({ ...casa, discountPrice: 120_000_000 })).toBe(false);
    expect(hasOffer({ ...casa, discountPrice: 0 })).toBe(false);
    expect(hasOffer({ serviceRate: "A convenir" as const, price: 0, discountPrice: 10 })).toBe(false);
  });
});
