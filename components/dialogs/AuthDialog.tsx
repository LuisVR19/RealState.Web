"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { PRIVACY_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "../ui-provider";
import { PasswordInput } from "../ui/PasswordInput";
import { Turnstile, turnstileEnabled, type TurnstileHandle } from "../ui/Turnstile";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Traduce los errores de Supabase Auth sin revelar si un correo existe o no. */
function authError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo con el enlace que te enviamos antes de entrar.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  if (m.includes("captcha")) return "No pudimos verificar que no eres un robot. Intenta de nuevo.";
  if (m.includes("password")) return "La contraseña debe tener al menos 8 caracteres, con letras y números.";
  return "No pudimos completar la operación. Intenta de nuevo.";
}

export function AuthDialog({ initialMode }: { initialMode: "login" | "register" }) {
  const { close, open } = useUI();
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const reg = mode === "register";
  const captcha = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const phone = normalizePhone(String(form.get("phone") ?? ""));

    if (!EMAIL_RE.test(email)) return setError("Escribe un correo válido.");
    if (reg) {
      if (name.length < 2) return setError("Escribe tu nombre completo.");
      if (phone && !isValidPhone(phone)) return setError("El WhatsApp debe tener 8 dígitos de Costa Rica.");
      if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) return setError("La contraseña debe tener al menos 8 caracteres, con letras y números.");
      if (form.get("consent") !== "on") return setError("Para crear la cuenta debes aceptar la política de privacidad y los términos.");
    } else if (!password) return setError("Escribe tu contraseña.");
    // Supabase Auth valida el token cuando el captcha está activado en el proyecto.
    const token = captcha.current?.token() || undefined;
    if (turnstileEnabled && !token) return setError("Espera un momento: estamos verificando que no eres un robot.");

    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      if (reg) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // La base (trigger handle_new_auth_user) crea el cliente con estos datos.
          options: {
            data: { name, phone: phone || undefined, privacy_version: PRIVACY_VERSION, privacy_accepted_at: new Date().toISOString() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/para-ti`,
            captchaToken: token,
          },
        });
        if (error) return setError(authError(error.message));
        if (!data.session) return setSentTo(email); // Confirmación por correo activada.
        router.refresh();
        open({ type: "prefs", welcome: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
        if (error) return setError(authError(error.message));
        close();
        router.refresh();
      }
    } finally {
      captcha.current?.reset(); // El token es de un solo uso.
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="dialog-backdrop z-dialog" onClick={close}>
        <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,100%)", gap: 14, padding: 22, alignItems: "center", textAlign: "center" }}>
          <i className="ph ph-envelope-simple-open" style={{ fontSize: 34, color: "var(--color-accent)" }} />
          <span className="dialog-title">Revisa tu correo</span>
          <span className="dialog-sub">Te enviamos un enlace a <strong>{sentTo}</strong> para confirmar tu cuenta. Al abrirlo entrarás directo a tus coincidencias.</span>
          <button className="btn btn-primary" onClick={close} style={{ height: 42, width: "100%" }}>Entendido</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop z-dialog" onClick={close}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} noValidate style={{ width: "min(420px,100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", gap: 16, padding: 22 }}>
        <div className="dialog-head">
          <div className="dialog-head-text">
            <span className="dialog-title">{reg ? "Crea tu cuenta" : "Inicia sesión"}</span>
            <span className="dialog-sub">{reg ? "Guarda tus preferencias y te mostramos solo las propiedades o vehículos que encajan con lo que buscas." : "Entra para ver tus coincidencias y tus visitas."}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
        </div>
        <div className="auth-tabs">
          {([["login", "Iniciar sesión"], ["register", "Crear cuenta"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setError(null); }} className={`chip chip-tab${mode === k ? " is-on" : ""}`}>{l}</button>
          ))}
        </div>
        {reg && (
          <div className="grid-auto-160">
            <div className="field"><label htmlFor="auth-name">Nombre completo</label><input id="auth-name" className="input input-42" name="name" autoComplete="name" maxLength={120} required /></div>
            <div className="field"><label htmlFor="auth-phone">WhatsApp</label><input id="auth-phone" className="input input-42" name="phone" type="tel" placeholder="8888 8888" autoComplete="tel" maxLength={16} /></div>
          </div>
        )}
        <div className="field"><label htmlFor="auth-email">Correo</label><input id="auth-email" className="input input-42" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" maxLength={254} required /></div>
        <div className="field"><label htmlFor="auth-pass">Contraseña</label><PasswordInput id="auth-pass" className="input input-42" name="password" autoComplete={reg ? "new-password" : "current-password"} placeholder={reg ? "Mínimo 8 caracteres, con letras y números" : "••••••••"} maxLength={72} required /></div>
        {reg && (
          <label className="consent">
            <input type="checkbox" name="consent" required />
            <span>He leído y acepto la <a href="/politica-de-privacidad" target="_blank" rel="noopener">política de privacidad</a> y los <a href="/terminos-y-condiciones" target="_blank" rel="noopener">términos y condiciones</a>. Autorizo el uso de mis datos para recibir recomendaciones de propiedades y ser contactado por un asesor.</span>
          </label>
        )}
        <Turnstile ref={captcha} action="auth" onChange={setCaptchaToken} />
        {error && <div role="alert" style={{ fontSize: 13, color: "#8a2f24" }}>{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy || (turnstileEnabled && !captchaToken)} style={{ height: 44, fontSize: 15 }}>{busy ? "Un momento…" : reg ? "Crear cuenta" : "Entrar"}</button>
      </form>
    </div>
  );
}
