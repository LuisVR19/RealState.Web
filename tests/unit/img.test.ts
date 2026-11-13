// lib/img.ts: URLs de /img para fotos de Storage y validación de lo que pide la ruta.
import { describe, expect, it } from "vitest";
import { img, parseImgParams, parseImgPath } from "@/lib/img";

const SB = "https://abc.supabase.co";
const photo = `${SB}/storage/v1/object/public/property-images/1111/2222.jpg`;

describe("img()", () => {
  it("convierte fotos del Storage del proyecto a /img con ancho", () => {
    expect(img(photo, 800, "webp", SB)).toBe("/img/property-images/1111/2222.jpg?w=800");
  });
  it("agrega el formato cuando no es webp", () => {
    expect(img(photo, 1200, "jpeg", SB)).toBe("/img/property-images/1111/2222.jpg?w=1200&f=jpeg");
  });
  it("ignora la query y el hash de la URL original", () => {
    expect(img(`${photo}?t=1#x`, 160, "webp", SB)).toBe("/img/property-images/1111/2222.jpg?w=160");
  });
  it("tolera la barra final en la URL de Supabase", () => {
    expect(img(photo, 400, "webp", `${SB}/`)).toBe("/img/property-images/1111/2222.jpg?w=400");
  });
  it("deja igual las URLs externas o de otro proyecto", () => {
    expect(img("https://images.unsplash.com/photo-1?w=800", 800, "webp", SB)).toBe("https://images.unsplash.com/photo-1?w=800");
    expect(img("https://otro.supabase.co/storage/v1/object/public/property-images/a.jpg", 800, "webp", SB)).toContain("otro.supabase.co");
  });
  it("devuelve cadena vacía sin URL y la URL original sin Supabase configurado", () => {
    expect(img(null, 800, "webp", SB)).toBe("");
    expect(img(photo, 800, "webp", "")).toBe(photo);
  });
});

describe("parseImgPath()", () => {
  it("acepta buckets públicos conocidos", () => {
    expect(parseImgPath(["property-images", "1111", "2222.jpg"])).toBe("property-images/1111/2222.jpg");
    expect(parseImgPath(["ad-images", "a.webp"])).toBe("ad-images/a.webp");
  });
  it.each([
    [["otro-bucket", "a.jpg"]],
    [["property-images"]],
    [["property-images", "..", "a.jpg"]],
    [["property-images", "a b.jpg"]],
    [["property-images", "a%2F..%2Fb.jpg"]],
  ])("rechaza %j", (segments) => {
    expect(parseImgPath(segments)).toBeNull();
  });
});

describe("parseImgParams()", () => {
  it("usa ancho y formato válidos", () => {
    expect(parseImgParams(new URLSearchParams("w=400&f=jpeg"))).toEqual({ w: 400, f: "jpeg" });
  });
  it("cae a 1200 webp con valores fuera de lista", () => {
    expect(parseImgParams(new URLSearchParams("w=9999&f=gif"))).toEqual({ w: 1200, f: "webp" });
    expect(parseImgParams(new URLSearchParams(""))).toEqual({ w: 1200, f: "webp" });
  });
});
