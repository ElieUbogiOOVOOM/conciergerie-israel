import { forwardRef, type ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 font-ui text-sm font-medium tracking-wide " +
  "rounded-sm px-4 py-2 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2";

// Charte claire : action principale en encre franche virant à l'or profond ;
// variant ghost discret (filet encre) s'allumant en or ; danger pour les actions
// destructives (rouge sémantique d'annulation). Aucun dégradé.
const variants: Record<Variant, string> = {
  primary: "bg-encre text-creme hover:bg-or-profond",
  ghost: "border border-encre/20 text-encre hover:border-or hover:text-or-profond",
  danger: "bg-statut-annule text-creme hover:bg-statut-annule/85",
};

type ButtonProps = {
  variant?: Variant;
} & ComponentPropsWithoutRef<"button">;

/** Bouton du back-office, fidèle à la charte (thème clair). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[base, variants[variant], className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
