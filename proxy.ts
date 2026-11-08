// Refresca la sesión de Supabase (cookies) antes de las rutas que la leen en el servidor.
// Se limita a esas rutas a propósito: el resto del sitio es público y cacheado, y no debe
// pagar una verificación de sesión por petición (el navegador refresca su propio token).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // No poner lógica entre createServerClient y getClaims: getClaims refresca el token si venció.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/para-ti/:path*",
    // El listado solo lee la sesión cuando se piden las guardadas.
    { source: "/catalogo", has: [{ type: "query", key: "guardadas" }] },
  ],
};
