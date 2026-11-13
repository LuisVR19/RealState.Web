"use client";

import { useEffect, useState } from "react";
import { img } from "@/lib/img";

/** Galería de la ficha: mosaico en escritorio, carrusel en celular y visor a pantalla completa. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const k = images.length;
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const step = (d: number) => setIdx((i) => (i + d + k) % k);
  const show = (i: number) => { setIdx(i % k); setLightbox(true); };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  return (
    <>
      <div className="gallery-desk">
        <button onClick={() => show(0)} className="gallery-main"><div className="lighten fill"><img src={img(images[0], 1200)} alt={title} /></div></button>
        <button onClick={() => show(1)}><div className="lighten fill"><img src={img(images[1 % k], 800)} alt="" /></div></button>
        <button onClick={() => show(2)}><div className="lighten fill"><img src={img(images[2 % k], 800)} alt="" /></div></button>
        <button className="btn btn-secondary gallery-all" onClick={() => show(0)}><i className="ph ph-squares-four" style={{ fontSize: 16 }} />Ver las {k} fotos</button>
      </div>
      <div className="gallery-mob">
        <div onClick={() => setLightbox(true)} className="lighten fill"><img src={img(images[idx], 1200)} alt={title} /></div>
        <button onClick={() => step(-1)} aria-label="Anterior" className="gallery-mob-nav is-prev"><i className="ph ph-caret-left" style={{ fontSize: 17 }} /></button>
        <button onClick={() => step(1)} aria-label="Siguiente" className="gallery-mob-nav is-next"><i className="ph ph-caret-right" style={{ fontSize: 17 }} /></button>
        <span className="gallery-mob-counter">{idx + 1} / {k}</span>
      </div>
      {lightbox && (
        <div className="lightbox">
          <div className="lightbox-top">
            <span style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>{idx + 1} de {k}</span>
            <button className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Cerrar" title="Cerrar (Esc)"><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
          </div>
          <div className="lightbox-stage">
            <img src={img(images[idx], 1600)} alt="" />
            <button onClick={() => step(-1)} aria-label="Anterior" className="lightbox-nav is-prev"><i className="ph ph-caret-left" style={{ fontSize: 19 }} /></button>
            <button onClick={() => step(1)} aria-label="Siguiente" className="lightbox-nav is-next"><i className="ph ph-caret-right" style={{ fontSize: 19 }} /></button>
          </div>
          <div className="lightbox-thumbs">
            {images.map((src, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{ opacity: i === idx ? 1 : 0.5, boxShadow: i === idx ? "0 0 0 2px var(--color-accent)" : "none" }}><img src={img(src, 160)} alt="" loading="lazy" /></button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
