"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CATEGORY_SLUG, initialsOf, NAV_OPS, waProperty } from "@/lib/format";
import { CATALOG_PATH, searchPath } from "@/lib/routes";

const VEHICLES_SLUG = CATEGORY_SLUG["Vehículo"];
const SERVICES_SLUG = CATEGORY_SLUG["Servicio"];
import { useUI } from "./ui-provider";

function NavItems({ onNavigate, mobile }: { onNavigate: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const op = sp.get("op");
  const cat = sp.get("cat");
  const cls = mobile ? "menu-link" : "nav-link";
  const inCatalog = pathname === CATALOG_PATH;
  return (
    <>
      {NAV_OPS.map(([label, k]) => (
        <Link key={k} href={searchPath({ operation: k })} onClick={onNavigate} className={cls + (inCatalog && op === k && cat !== VEHICLES_SLUG && cat !== SERVICES_SLUG ? " is-active" : "")}>{label}</Link>
      ))}
      <Link href={searchPath({ category: "Vehículo" })} onClick={onNavigate} className={cls + (inCatalog && cat === VEHICLES_SLUG ? " is-active" : "")}>Vehículos</Link>
      <Link href={searchPath({ category: "Servicio" })} onClick={onNavigate} className={cls + (inCatalog && cat === SERVICES_SLUG ? " is-active" : "")}>Servicios</Link>
      <Link href="/#equipo" onClick={onNavigate} className={cls + (pathname.startsWith("/asesores") ? " is-active" : "")}>Nuestro equipo</Link>
    </>
  );
}

const NavFallback = ({ mobile }: { mobile?: boolean }) => (
  <>
    {NAV_OPS.map(([label, k]) => <Link key={k} href={searchPath({ operation: k })} className={mobile ? "menu-link" : "nav-link"}>{label}</Link>)}
    <Link href={searchPath({ category: "Vehículo" })} className={mobile ? "menu-link" : "nav-link"}>Vehículos</Link>
    <Link href={searchPath({ category: "Servicio" })} className={mobile ? "menu-link" : "nav-link"}>Servicios</Link>
    <Link href="/#equipo" className={mobile ? "menu-link" : "nav-link"}>Nuestro equipo</Link>
  </>
);

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, account, favorites, matchCount, signOut, contact } = useUI();
  const favCount = favorites.size;
  const [menu, setMenu] = useState(false);
  const [acct, setAcct] = useState(false);

  // La ficha de un anuncio tiene su propia barra superior.
  if (/^\/catalogo\/[^/]+/.test(pathname)) return null;

  const teamWa = waProperty(contact.team);
  const closeAll = () => { setMenu(false); setAcct(false); };
  const logout = async () => {
    await signOut();
    if (pathname === "/para-ti") router.push("/");
  };
  const acctItems = account?.kind === "client"
    ? [
        { label: "Para ti", icon: "ph-sparkle", badge: matchCount, onClick: () => router.push("/para-ti") },
        { label: "Mis preferencias", icon: "ph-sliders-horizontal", onClick: () => open({ type: "prefs" }) },
        { label: "Mis visitas", icon: "ph-calendar-check", onClick: () => router.push("/para-ti#visitas") },
        { label: "Cerrar sesión", icon: "ph-sign-out", onClick: () => void logout() },
      ]
    : [{ label: "Cerrar sesión", icon: "ph-sign-out", onClick: () => void logout() }];

  return (
    <>
      <header className="site-header">
        <Link href="/" onClick={closeAll} className="brand">
          <span className="brand-mark"><i className="ph ph-house-line" style={{ fontSize: 18 }} /></span>
          <span className="brand-text">
            <span className="brand-name">Thomas Mata S.A.</span>
            <span className="brand-sub">Bienes raíces · Costa Rica</span>
          </span>
        </Link>
        <nav className="site-nav">
          <Suspense fallback={<NavFallback />}><NavItems onNavigate={closeAll} /></Suspense>
        </nav>
        <div className="header-actions">
          {account === undefined ? (
            <span className="sk sk-block sk-login" aria-hidden />
          ) : !account ? (
            <button className="btn btn-secondary login-btn" onClick={() => { closeAll(); open({ type: "auth", mode: "login" }); }} aria-label="Iniciar sesión">
              <i className="ph ph-user-circle" style={{ fontSize: 18 }} /><span className="hide-lt-640">Iniciar sesión</span>
            </button>
          ) : (
            <button className="acct-btn" onClick={() => { setAcct(!acct); setMenu(false); }} aria-label="Mi cuenta">
              <span className="avatar avatar-28">{initialsOf(account.name)}</span>
              <span className="hide-lt-640">{account.name.split(" ")[0]}</span>
              <i className="ph ph-caret-down" style={{ fontSize: 12, color: "var(--color-neutral-500)" }} />
            </button>
          )}
          <Link href={account?.kind === "client" ? searchPath({ saved: true }) : "#"} onClick={(e) => { if (account?.kind !== "client") { e.preventDefault(); open({ type: "auth", mode: account ? "login" : "register" }); } }} className="btn btn-secondary btn-icon" aria-label="Guardadas" style={{ position: "relative" }}>
            <i className="ph ph-heart" style={{ fontSize: 18 }} />
            {favCount > 0 && <span className="count-badge">{favCount}</span>}
          </Link>
          <a className="btn btn-primary show-ge-1180" href={teamWa} target="_blank" rel="noopener" style={{ height: 36 }}>
            <i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} />Hablar con un asesor
          </a>
          <button className="btn btn-secondary btn-icon show-lt-1180" onClick={() => { setMenu(!menu); setAcct(false); }} aria-label="Menú">
            <i className={menu ? "ph ph-x" : "ph ph-list"} style={{ fontSize: 18 }} />
          </button>
        </div>
        {menu && (
          <div className="mobile-menu">
            <Suspense fallback={<NavFallback mobile />}><NavItems onNavigate={closeAll} mobile /></Suspense>
            <a className="btn btn-primary" href={teamWa} target="_blank" rel="noopener" style={{ height: 44, marginTop: 8 }}>
              <i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} />Hablar con un asesor
            </a>
          </div>
        )}
        {account && acct && (
          <div className="acct-menu">
            <div className="acct-menu-head">
              <span style={{ fontSize: 14, fontWeight: 500 }}>{account.name}</span>
              <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{account.email}</span>
            </div>
            {acctItems.map((it) => (
              <button key={it.label} className="acct-item" onClick={() => { setAcct(false); it.onClick(); }}>
                <i className={`ph ${it.icon}`} /><span style={{ flex: 1 }}>{it.label}</span>
                {!!it.badge && <span className="pill-badge">{it.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </header>
      {acct && <div className="click-catcher z-acct" onClick={() => setAcct(false)} />}
    </>
  );
}
