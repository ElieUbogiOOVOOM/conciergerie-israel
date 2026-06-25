"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/Spinner";

const NAV = [
  { href: "/planning", label: "Planning" },
  { href: "/rendez-vous", label: "Rendez-vous" },
  { href: "/prestations", label: "Prestations" },
  { href: "/intervenants", label: "Intervenants" },
  { href: "/exports", label: "Exports" },
];

/**
 * Coquille du back-office : garde d'authentification côté client (complète le
 * middleware), navigation latérale et barre supérieure avec déconnexion.
 * Les enfants ne sont rendus qu'une fois la session confirmée.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, email, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Garde client : redirige vers login dès que la session est invalide.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="auth-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-8 border-b border-sable bg-ivoire px-5 py-5 md:w-60 md:border-b-0 md:border-r md:py-7">
        <Link href="/planning" className="flex items-center gap-2.5 text-or-profond">
          <Logo size={32} title="HYMEA — back-office" />
          <span className="font-title text-lg tracking-[0.18em]">HYMEA</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex gap-1 md:flex-col">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-3 py-2 font-ui text-sm font-medium transition-colors ${
                  active
                    ? "bg-sable/60 text-or-profond"
                    : "text-encre-doux hover:bg-sable/40 hover:text-encre"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-sable bg-creme px-5 py-3">
          {email && (
            <span
              className="hidden font-ui text-sm text-encre-doux sm:inline"
              data-testid="admin-email"
            >
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-sm border border-encre/20 px-3 py-1.5 font-ui text-sm font-medium text-encre transition-colors hover:border-or hover:text-or-profond focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
          >
            Se déconnecter
          </button>
        </header>
        <main className="min-w-0 flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
