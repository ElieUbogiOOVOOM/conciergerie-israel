"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

/**
 * Bannière de la page de garde HYMEA (#nouvelle accueil). Logo en grand, slogan
 * « The office conciergerie », titre signature (H1 unique) et chapô « expérience
 * HYMEA ». Un mandala surdimensionné flotte en fond et suit légèrement le défilement
 * (parallaxe) — le « mouvement quand on slide » demandé, neutralisé sous
 * prefers-reduced-motion (cf. globals.css). Double CTA : explorer les univers
 * (ancre #univers) et travailler avec nous (bloc contact #contact).
 */
export function LandingHero() {
  const t = useTranslations("Landing.hero");
  const ornamentRef = useRef<HTMLDivElement>(null);

  // Parallaxe verticale douce du mandala de fond, pilotée au scroll via une
  // variable CSS (.parallax). rAF pour rester fluide ; respect du reduced-motion
  // assuré côté CSS. Désactivée si l'utilisateur préfère moins d'animations.
  useEffect(() => {
    const node = ornamentRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * 0.18, 160);
        node.style.setProperty("--parallax", `${offset}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="relative isolate flex min-h-[88svh] items-center overflow-hidden border-b border-encre/10">
      {/* Mandala de marque surdimensionné, en filigrane, flottant + parallaxe. */}
      <div
        ref={ornamentRef}
        aria-hidden
        className="parallax pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      >
        <Logo size={760} className="float-slow max-w-[140%] text-or/[0.06] sm:text-or/[0.08]" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 py-24 text-center lg:py-32">
        <Logo size={84} className="mx-auto text-or" title="HYMEA" />

        <p className="mt-7 font-label text-sm uppercase tracking-[0.42em] text-or-profond">
          {t("slogan")}
        </p>

        <h1 className="mx-auto mt-7 max-w-4xl font-title text-[length:var(--text-display)] leading-[1.05] text-encre">
          {t("title")}
        </h1>

        <p className="mx-auto mt-8 max-w-[60ch] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("description")}
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="#univers" variant="primary">
            {t("ctaPrimary")}
          </Button>
          <Button href="#contact" variant="ghost">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>

      {/* Indice de défilement, invitant au « slide ». */}
      <a
        href="#univers"
        className="absolute inset-x-0 bottom-7 mx-auto flex w-fit flex-col items-center gap-2 font-label text-[0.65rem] uppercase tracking-[0.3em] text-encre/45 transition-colors hover:text-or-profond"
      >
        {t("scrollHint")}
        <span aria-hidden className="float-slow text-base leading-none">
          ↓
        </span>
      </a>
    </section>
  );
}
