// Page de démonstration de la charte HYMEA (#21).
// Vérifie l'application fidèle des couleurs, des polices et de l'échelle fluide.
// Provisoire : remplacée par la vraie page d'accueil localisée en #22/#24.
export default function CharteDemo() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-label text-sm uppercase tracking-[0.3em] text-or-champagne">
        HYMEA — Design system
      </p>

      <h1 className="mt-6 font-title text-[length:var(--text-display)] text-creme">
        Le luxe, dans la sobriété.
      </h1>

      <p className="mt-8 max-w-[var(--measure)] text-[length:var(--text-lead)] text-creme/80">
        Conciergerie et nettoyage premium en Israël. Cette page de démonstration valide la charte —
        fond charbon, or champagne rare, ivoire et crème — ainsi que les typographies Cinzel,
        Cormorant Garamond et Jost.
      </p>

      <section className="mt-16">
        <h2 className="font-title text-[length:var(--text-h2)] text-or-profond">Palette</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { name: "Charbon", className: "bg-charbon border border-charbon-bordure" },
            { name: "Or champagne", className: "bg-or-champagne" },
            { name: "Ivoire", className: "bg-ivoire" },
            { name: "Crème", className: "bg-creme" },
            { name: "Or profond", className: "bg-or-profond" },
          ].map((swatch) => (
            <div key={swatch.name}>
              <div className={`aspect-square rounded-sm ${swatch.className}`} />
              <p className="mt-2 font-label text-xs uppercase tracking-widest text-creme/70">
                {swatch.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-title text-[length:var(--text-h2)] text-or-profond">Typographies</h2>
        <p className="mt-6 font-title text-[length:var(--text-h1)] text-creme">Cinzel — titres</p>
        <p className="mt-2 font-body text-[length:var(--text-h3)] text-creme/85">
          Cormorant Garamond — corps de texte éditorial.
        </p>
        <p className="mt-2 font-label text-base uppercase tracking-widest text-creme/70">
          Jost — labels & navigation
        </p>
      </section>
    </main>
  );
}
