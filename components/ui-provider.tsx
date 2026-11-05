"use client";

// Estado de interfaz compartido: diálogo abierto, sesión de Supabase en el navegador y
// favoritos del cliente. Las páginas públicas se sirven cacheadas e iguales para todos;
// lo personal (nombre, favoritos, coincidencias) se completa aquí, en el navegador, con la
// RLS limitando cada consulta a las filas del propio cliente.
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent, AmenityOption, PropertySummary, SiteContact } from "@/lib/types";
import { AuthDialog } from "./dialogs/AuthDialog";
import { PreferencesDialog } from "./dialogs/PreferencesDialog";
import { ShareDialog } from "./dialogs/ShareDialog";
import { VisitDialog } from "./dialogs/VisitDialog";
import { WizardDialog } from "./dialogs/WizardDialog";

export type DialogState =
  | { type: "auth"; mode: "login" | "register" }
  | { type: "visit"; agent: Agent; property?: PropertySummary | null }
  | { type: "share"; property: PropertySummary }
  | { type: "wizard" }
  | { type: "prefs"; welcome?: boolean }
  | null;

export interface Account {
  /** "client": cliente del sitio; "team": usuario del equipo (usa el panel, sin funciones de cliente). */
  kind: "client" | "team";
  userId: string;
  clientId: string | null;
  name: string;
  email: string;
}

interface UIContextValue {
  dialog: DialogState;
  open: (d: Exclude<DialogState, null>) => void;
  close: () => void;
  /** undefined mientras se lee la sesión; null sin sesión. */
  account: Account | null | undefined;
  favorites: ReadonlySet<string>;
  matchCount: number;
  toggleFavorite: (propertyId: string) => Promise<void>;
  /** Vuelve a leer cuenta, favoritos y coincidencias (tras guardar preferencias, por ejemplo). */
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  amenities: AmenityOption[];
  /** Ubicaciones (ciudad / cantón) con propiedades publicadas o zona destacada. */
  locations: string[];
  totalProperties: number;
  /** Contacto general del sitio (el del dueño del negocio). */
  contact: SiteContact;
}

const UIContext = createContext<UIContextValue | null>(null);

const NO_FAVORITES: ReadonlySet<string> = new Set();
const noSubscribe = () => () => {};

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI debe usarse dentro de <UIProvider>");
  // Mientras un componente se hidrata, React usa el valor "de servidor" (false); al terminar lo vuelve
  // a pintar con el de cliente (true). Los componentes que se montan después reciben true de inmediato.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  // Lo personal (sesión, favoritos) se lee en el navegador y puede llegar ANTES de que se hidrate un
  // <Suspense> del layout o de la página. Si ese componente se hidratara con la sesión ya leída, su HTML
  // no coincidiría con el del servidor: error de hidratación y, en desarrollo, recarga completa en bucle.
  // Por eso, durante la hidratación se entrega exactamente lo que vio el servidor.
  if (hydrated) return ctx;
  return { ...ctx, account: undefined, favorites: NO_FAVORITES, matchCount: 0 };
}

export function UIProvider({ children, totalProperties, amenities, locations, contact }: { children: ReactNode; totalProperties: number; amenities: AmenityOption[]; locations: string[]; contact: SiteContact }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [matchCount, setMatchCount] = useState(0);
  const close = useCallback(() => setDialog(null), []);

  // Sesión: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…
  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sin llamadas a Supabase dentro del callback (puede bloquear el cliente): solo se guarda el usuario.
      // Para la interfaz basta la sesión local; lo que se lee de la base lo protege la RLS.
      setUser((prev) => (prev?.id === session?.user.id && prev !== undefined ? prev : session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Cada carga lleva un número de secuencia: si mientras tanto cambia la sesión (otro usuario,
  // cierre de sesión), su resultado se descarta y no se mezclan datos de dos cuentas.
  const loadSeq = useRef(0);
  // Favoritos marcados o quitados mientras la cuenta se está cargando: se reaplican sobre lo que
  // devuelve la base para que una lectura iniciada antes del clic no pise el cambio.
  const favEdits = useRef(new Map<string, boolean>());
  const loadAccount = useCallback(async (user: User | null | undefined) => {
    const seq = ++loadSeq.current;
    favEdits.current.clear();
    const stale = () => seq !== loadSeq.current;
    if (user === undefined) return;
    if (user === null) {
      setAccount(null);
      setFavorites(new Set());
      setMatchCount(0);
      return;
    }
    const supabase = createClient();
    const uid = user.id;
    setAccount((prev) => (prev?.userId === uid ? prev : undefined)); // "cargando" para un usuario nuevo
    const { data: client } = await supabase.from("clients").select("id, name, email").eq("auth_user_id", uid).maybeSingle();
    if (stale()) return;
    if (!client) {
      const meta = user.user_metadata as { name?: string };
      setAccount({ kind: "team", userId: uid, clientId: null, name: meta.name || user.email || "Mi cuenta", email: user.email ?? "" });
      setFavorites(new Set());
      setMatchCount(0);
      return;
    }
    setAccount({ kind: "client", userId: uid, clientId: client.id, name: client.name, email: client.email ?? user.email ?? "" });
    const [favs, matches] = await Promise.all([
      supabase.from("client_favorites").select("property_id").limit(500),
      supabase.rpc("get_client_matches", { p_client_id: client.id }),
    ]);
    if (stale()) return;
    const loaded = new Set((favs.data ?? []).map((f) => f.property_id));
    favEdits.current.forEach((fav, id) => (fav ? loaded.add(id) : loaded.delete(id)));
    favEdits.current.clear();
    setFavorites(loaded);
    setMatchCount(matches.data?.length ?? 0);
  }, []);

  useEffect(() => {
    loadAccount(user).catch((e) => console.error("[cuenta]", e));
  }, [user, loadAccount]);

  const refreshAccount = useCallback(() => loadAccount(user), [loadAccount, user]);

  const toggleFavorite = useCallback(
    async (propertyId: string) => {
      if (!account || account.kind !== "client" || !account.clientId) {
        setDialog({ type: "auth", mode: account ? "login" : "register" });
        return;
      }
      const supabase = createClient();
      const wasFav = favorites.has(propertyId);
      // Optimista: se pinta ya y se revierte si la base rechaza el cambio.
      const apply = (fav: boolean) => {
        favEdits.current.set(propertyId, fav);
        setFavorites((prev) => {
          const next = new Set(prev);
          if (fav) next.add(propertyId);
          else next.delete(propertyId);
          return next;
        });
      };
      apply(!wasFav);
      const { error } = wasFav
        ? await supabase.from("client_favorites").delete().eq("client_id", account.clientId).eq("property_id", propertyId)
        : await supabase.from("client_favorites").upsert({ client_id: account.clientId, property_id: propertyId }, { ignoreDuplicates: true });
      if (error) {
        console.error("[favoritos]", error.message);
        apply(wasFav);
      }
    },
    [account, favorites],
  );

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const value = useMemo(
    () => ({ dialog, open: setDialog, close, account, favorites, matchCount, toggleFavorite, refreshAccount, signOut, amenities, locations, totalProperties, contact }),
    [dialog, close, account, favorites, matchCount, toggleFavorite, refreshAccount, signOut, amenities, locations, totalProperties, contact],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      {dialog?.type === "auth" && <AuthDialog initialMode={dialog.mode} />}
      {dialog?.type === "visit" && <VisitDialog agent={dialog.agent} property={dialog.property} />}
      {dialog?.type === "share" && <ShareDialog property={dialog.property} />}
      {dialog?.type === "wizard" && <WizardDialog />}
      {dialog?.type === "prefs" && <PreferencesDialog welcome={dialog.welcome} />}
    </UIContext.Provider>
  );
}
