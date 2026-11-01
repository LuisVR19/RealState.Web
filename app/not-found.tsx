import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-scroll">
      <div className="container empty-state" style={{ paddingTop: 64 }}>
        <i className="ph ph-house-line" style={{ fontSize: 30, color: "var(--color-neutral-500)" }} />
        <span style={{ fontSize: 18, fontWeight: 500 }}>No encontramos esta página</span>
        <span style={{ fontSize: 14, color: "var(--color-neutral-400)" }}>Puede que la propiedad ya no esté publicada.</span>
        <Link href="/propiedades" className="btn btn-primary">Ver propiedades</Link>
      </div>
    </main>
  );
}
