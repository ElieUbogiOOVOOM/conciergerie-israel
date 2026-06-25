import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 font-ui text-sm font-medium tracking-wide " +
  "rounded-sm px-4 py-2 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2";

// Charte claire : action principale en encre franche virant à l'or profond ;
// variant ghost discret (filet encre) s'allumant en or. Aucun dégradé.
const variants: Record<Variant, string> = {
  primary: "bg-encre text-creme hover:bg-or-profond",
  ghost: "border border-encre/20 text-encre hover:border-or hover:text-or-profond",
};

type ButtonProps = {
  variant?: Variant;
} & ComponentPropsWithoutRef<"button">;

/** Bouton du back-office, fidèle à la charte (thème clair). */
export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button className={[base, variants[variant], className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
