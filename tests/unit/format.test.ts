import { describe, expect, it } from "vitest";
import { crc, formatPhone, isValidPhone, monthlyPayment, normalizePhone, shortCrc } from "@/lib/format";

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
