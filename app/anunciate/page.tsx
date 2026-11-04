import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdBanner } from "@/components/AdBanner";
import { AdServices, SponsoredCard } from "@/components/Ads";
import { OpenDialogButton } from "@/components/OpenDialogButton";
import { SiteFooter } from "@/components/SiteFooter";
import { Sk } from "@/components/Skeletons";
import { SAMPLE_ADS } from "@/lib/ads";
import { getSiteContact } from "@/lib/data";
import { waLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Anuncie su marca · Thomas Mata S.A.",
  description: "Espacios de publicidad para marcas de crédito, mudanzas, seguros, muebles y servicios para el hogar, frente a personas que buscan propiedad en Cartago.",
};

const PRINCIPLES = [
  ["ph-tag", "Siempre rotulada", "Cada anuncio dice «Publicidad» o «Patrocinado». Nunca se confunde con una propiedad."],
  ["ph-number-circle-one", "Uno por pantalla", "Como máximo un anuncio por formato en cada página, para que la búsqueda siga siendo lo principal."],
  ["ph-prohibit", "Sin interrupciones", "Sin ventanas emergentes, videos automáticos, sonido ni anuncios que tapen el contenido."],
  ["ph-eye-slash", "El usuario decide", "El banner de la portada se puede ocultar con un clic durante toda la visita."],
] as const;

const STEPS = [
  ["01", "Conversemos", "Nos cuenta qué ofrece su marca y elegimos juntos el formato y las fechas."],
  ["02", "Envíe su material", "Logo, titular, texto corto, enlace y color de marca. Le ayudamos a ajustarlo."],
  ["03", "Revisión y publicación", "Revisamos que sea relevante para quien busca vivienda y lo publicamos."],
] as const;

const SPECS = [
  ["Logo", "PNG, JPG o WebP cuadrado, mínimo 200 × 200 px"],
  ["Imagen (opcional)", "JPG o WebP horizontal 4:3, mínimo 1200 × 900 px"],
  ["Titular", "Hasta 60 caracteres"],
  ["Texto", "Hasta 120 caracteres"],
  ["Botón", "Hasta 24 caracteres, p. ej. «Cotizar»"],
  ["Enlace", "Página de su marca (https)"],
] as const;

export default function AdvertisePage() {
  // Vistas previas con marcas ficticias (no se miden ni salen como publicidad real).
  const banner = SAMPLE_ADS.home_banner[0];
  const card = SAMPLE_ADS.search_card[0];
  const services = SAMPLE_ADS.detail_services;

  return (
    <main className="page-scroll">
      <div className="container adv">
        <section className="adv-hero">
          <span className="eyebrow">Para marcas</span>
          <h1 className="page-title-40" style={{ maxWidth: 760, textWrap: "balance" }}>Anuncie su marca frente a quienes están por mudarse</h1>
          <p className="adv-lead">Bancos, mudanzas, seguros, muebles, acabados y servicios para el hogar: llegue a personas que están eligiendo casa en Cartago, en el momento en que más lo necesitan, con una publicidad discreta y bien rotulada.</p>
          <Suspense fallback={<div style={{ display: "flex", gap: 10 }}><Sk w={210} h={44} r="var(--radius-md)" /><Sk w={190} h={44} r="var(--radius-md)" /></div>}>
            <ContactButtons />
          </Suspense>
        </section>

        <section className="section">
          <div><h2 className="h2" style={{ marginBottom: 4 }}>Formatos disponibles</h2><div className="muted-14">Así se ve su marca dentro del sitio. Los ejemplos usan marcas ficticias.</div></div>
          <div className="adv-formats">
            {banner && (
              <article className="adv-format is-wide">
                <div className="adv-preview"><AdBanner ad={banner} dismissible={false} /></div>
                <FormatInfo name="Banner en la portada" where="Página de inicio, entre las zonas y el equipo" text="Franja horizontal con logo, titular y botón. El visitante puede ocultarla." />
              </article>
            )}
            {card && (
              <article className="adv-format">
                <div className="adv-preview is-center"><div style={{ width: "min(280px, 100%)" }}><SponsoredCard ad={card} /></div></div>
                <FormatInfo name="Tarjeta patrocinada" where="Resultados de búsqueda, una por página" text="Del mismo tamaño que una propiedad, con fondo de su marca y la etiqueta «Patrocinado»." />
              </article>
            )}
            {services.length > 0 && (
              <article className="adv-format">
                <div className="adv-preview"><AdServices ads={services} /></div>
                <FormatInfo name="Servicios recomendados" where="Ficha de cada propiedad, al final del contenido" text="Mosaico compacto junto a los próximos pasos de la compra: ideal para crédito, mudanza y seguros." />
              </article>
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="h2">Publicidad que no estorba</h2>
          <div className="adv-principles">
            {PRINCIPLES.map(([icon, t, d]) => (
              <div key={t} className="adv-principle">
                <i className={`ph ${icon}`} aria-hidden />
                <span style={{ fontSize: 15, fontWeight: 500 }}>{t}</span>
                <span style={{ fontSize: 13, color: "var(--color-neutral-400)", textWrap: "pretty" }}>{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="adv-split">
          <div className="stack-16">
            <h2 className="h2">Cómo funciona</h2>
            <div className="adv-steps">
              {STEPS.map(([n, t, d]) => (
                <div key={n} className="adv-step">
                  <span className="adv-step-num">{n}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{t}</span>
                    <span style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>{d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="adv-specs">
            <span style={{ fontSize: 16, fontWeight: 500 }}>Material que necesitamos</span>
            <dl>
              {SPECS.map(([k, v]) => <div key={k} className="charac-row"><dt style={{ color: "var(--color-neutral-400)" }}>{k}</dt><dd style={{ margin: 0, textAlign: "right" }}>{v}</dd></div>)}
            </dl>
          </div>
        </section>

        <Suspense fallback={null}><LiveFooter /></Suspense>
      </div>
    </main>
  );
}

function FormatInfo({ name, where, text }: { name: string; where: string; text: string }) {
  return (
    <div className="adv-format-info">
      <span style={{ fontSize: 17, fontWeight: 500 }}>{name}</span>
      <span className="adv-where"><i className="ph ph-map-pin-simple" aria-hidden />{where}</span>
      <span style={{ fontSize: 13, color: "var(--color-neutral-400)", textWrap: "pretty" }}>{text}</span>
    </div>
  );
}

/** El contacto sale del perfil del dueño (cambia sin redeploy): se lee en cada visita. */
async function ContactButtons() {
  await connection();
  const { team } = await getSiteContact();
  const wa = waLink(team, "Hola, me interesa anunciar mi marca en el sitio de Thomas Mata S.A.");
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <a className="btn btn-primary btn-44" href={wa} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} />Quiero anunciar</a>
      <OpenDialogButton dialog={{ type: "visit", agent: team }} className="btn btn-secondary btn-44"><i className="ph ph-calendar-check" style={{ fontSize: 18 }} />Agendar una reunión</OpenDialogButton>
    </div>
  );
}

async function LiveFooter() {
  await connection();
  return <SiteFooter />;
}
