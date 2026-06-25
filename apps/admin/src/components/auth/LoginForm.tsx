"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

/**
 * Formulaire de connexion au back-office. Sur succès, l'AuthProvider réhydrate
 * la session (access token en mémoire + cookies) et l'on bascule vers le planning.
 * Une session déjà valide redirige immédiatement (évite de revoir le login).
 */
export function LoginForm() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/planning");
    }
  }, [status, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/planning");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Identifiants invalides."
          : "Connexion impossible. Réessayez.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-sable bg-ivoire px-7 py-9 shadow-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-or-profond">
          <Logo size={44} title="HYMEA" />
          <h1 className="font-title text-xl tracking-[0.18em]">HYMEA</h1>
          <p className="font-ui text-sm text-encre-doux">Back-office</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-sable bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux">
              Mot de passe
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-sable bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
            />
          </label>

          {error && (
            <p role="alert" className="font-ui text-sm text-statut-annule">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </div>
    </main>
  );
}
