"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Balise rendue (section, div…). Défaut : div. */
  as?: ElementType;
  /** Retard d'apparition en ms (effet d'escalier sur une liste). */
  delay?: number;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * Révèle son contenu en fondu/translation lorsqu'il entre dans le viewport
 * (« mouvement quand on slide » de la page de garde). Repli accessible : le
 * contenu est visible d'emblée si IntersectionObserver est absent ou si
 * l'utilisateur préfère réduire les animations (géré côté CSS via .reveal).
 */
export function Reveal({ children, as: Tag = "div", delay = 0, className, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-visible={visible || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={["reveal", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
