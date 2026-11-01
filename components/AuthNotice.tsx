"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUI } from "./ui-provider";

/** Aviso cuando un enlace de Auth (confirmación, magic link) no se pudo usar: /?auth=error. */
export function AuthNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useUI();
  if (params.get("auth") !== "error") return null;

  const dismiss = () => {
    const sp = new URLSearchParams(params);
    sp.delete("auth");
    router.replace(pathname + (sp.size ? "?" + sp : ""), { scroll: false });
  };

  return (
    <div role="alert" className="container" style={{ paddingTop: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "12px 16px", borderRadius: 12, background: "#f7e8e6", color: "#8a2f24", fontSize: 14 }}>
        <i className="ph ph-warning-circle" style={{ fontSize: 18 }} />
        <span style={{ flex: "1 1 260px" }}>El enlace no es válido o ya venció. Si ya confirmaste tu correo, inicia sesión; si no, pide uno nuevo creando la cuenta otra vez.</span>
        <button className="btn btn-secondary" style={{ height: 34 }} onClick={() => { dismiss(); open({ type: "auth", mode: "login" }); }}>Iniciar sesión</button>
        <button className="btn btn-ghost btn-icon" aria-label="Cerrar aviso" onClick={dismiss}><i className="ph ph-x" /></button>
      </div>
    </div>
  );
}
