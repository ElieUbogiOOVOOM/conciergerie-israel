import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center font-label text-sm uppercase tracking-widest " +
  "px-7 py-3 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

// Charte claire : l'action principale est une touche d'encre franche (contraste
// AA sur crème comme sur or), qui vire à l'or profond au survol. Le variant ghost
// reste discret (filet encre) et s'allume en or. Aucun dégradé.
const variants: Record<Variant, string> = {
  primary: "bg-encre text-creme hover:bg-or-profond",
  ghost: "border border-encre/25 text-encre hover:border-or hover:text-or-profond",
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
