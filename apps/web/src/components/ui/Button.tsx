import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center font-label text-sm uppercase tracking-widest " +
  "px-7 py-3 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

// Charte : l'or champagne, rare, porte l'action principale (le 10 %). Le variant
// ghost reste discret (filet crème) et s'allume en or au survol. Aucun dégradé.
const variants: Record<Variant, string> = {
  primary: "bg-or-champagne text-charbon hover:bg-creme",
  ghost: "border border-creme/25 text-creme hover:border-or-champagne hover:text-creme",
};

function classesFor(variant: Variant, className?: string) {
  return [base, variants[variant], className].filter(Boolean).join(" ");
}

type LinkButtonProps = {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

type NativeButtonProps = {
  href?: undefined;
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

function isLinkButton(props: LinkButtonProps | NativeButtonProps): props is LinkButtonProps {
  return props.href !== undefined;
}

/**
 * Bouton/Lien réutilisable, fidèle à la charte. Avec `href` : rend un lien
 * d'ancre natif (`#…`), externe ou `mailto:`, ou un lien localisé (next-intl)
 * pour les routes internes. Sans `href` : rend un `<button>`.
 */
export function Button(props: LinkButtonProps | NativeButtonProps) {
  const { variant = "primary", className, children } = props;
  const classes = classesFor(variant, className);

  if (isLinkButton(props)) {
    const { href } = props;
    // Ancres internes, liens externes et mailto restent de simples <a>.
    if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
      return (
        <a href={href} className={classes} aria-label={props["aria-label"]}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-label={props["aria-label"]}>
        {children}
      </Link>
    );
  }

  const {
    href: _href,
    variant: _variant,
    className: _className,
    children: _children,
    ...rest
  } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
