"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarFeedToken } from "@hymea/shared";
import {
  calendarFeedUrl,
  createCalendarFeed,
  downloadRendezVousCsv,
  listCalendarFeeds,
  revokeCalendarFeed,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { fieldClass, labelClass } from "@/components/ui/form";

/** URL d'abonnement révélée une seule fois (à la création/régénération du lien). */
interface RevealedFeed {
  label: string;
  url: string;
}

/**
 * Exports & synchronisation agenda (#41) : export CSV complet des RDV et gestion
 * des abonnements iCal (création, régénération, révocation).
 *
 * Sécurité : le serveur ne stocke que le hash du jeton ; l'URL complète n'est donc
 * affichée qu'UNE seule fois, juste après la création/régénération. Elle doit être
 * copiée immédiatement et ne peut pas être ré-affichée ensuite.
 */
export function ExportsView() {
  const [feeds, setFeeds] = useState<CalendarFeedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedFeed | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setFeeds(await listCalendarFeeds());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onExportCsv = useCallback(async () => {
    setCsvBusy(true);
    setCsvError(null);
    try {
      await downloadRendezVousCsv({});
    } catch {
      setCsvError("Export impossible. Réessayez.");
    } finally {
      setCsvBusy(false);
    }
  }, []);

  /** Affiche l'URL fraîchement créée (révélation unique). */
  function reveal(created: CalendarFeedToken) {
    if (created.token) {
      setRevealed({ label: created.label, url: calendarFeedUrl(created.token) });
      setCopied(false);
    }
  }

  async function onCopyRevealed() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez l'URL d'abonnement :", revealed.url);
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (label.trim() === "") return;
    setBusy(true);
    try {
      const created = await createCalendarFeed(label.trim());
      reveal(created);
      setLabel("");
      await load();
    } catch {
      window.alert("Création du lien impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate(feed: CalendarFeedToken) {
    if (
      !window.confirm(
        `Régénérer le lien « ${feed.label} » ? L'ancienne URL cessera immédiatement de fonctionner.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const created = await createCalendarFeed(feed.label);
      await revokeCalendarFeed(feed.id);
      reveal(created);
      await load();
    } catch {
      window.alert("Régénération impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(feed: CalendarFeedToken) {
    if (!window.confirm(`Révoquer le lien « ${feed.label} » ? L'URL cessera de fonctionner.`)) {
      return;
    }
    setBusy(true);
    try {
      await revokeCalendarFeed(feed.id);
      await load();
    } catch {
      window.alert("Révocation impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Exports et synchronisation" className="flex max-w-3xl flex-col gap-8">
      <h1 className="font-title text-h2 text-encre">Exports &amp; agenda</h1>

      <article className="flex flex-col gap-3 rounded-md border border-sable bg-ivoire p-5">
        <h2 className="font-title text-h3 text-encre">Export CSV</h2>
        <p className="font-ui text-sm text-encre-doux">
          Télécharge l&apos;ensemble des rendez-vous. Pour un export restreint, utilisez le bouton «
          Exporter CSV » de la liste des rendez-vous : il respecte les filtres actifs.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => void onExportCsv()} disabled={csvBusy}>
            {csvBusy ? "Export…" : "Exporter tous les RDV (CSV)"}
          </Button>
          {csvError && (
            <span role="alert" className="font-ui text-sm text-statut-annule">
              {csvError}
            </span>
          )}
        </div>
      </article>

      <article className="flex flex-col gap-4 rounded-md border border-sable bg-ivoire p-5">
        <div>
          <h2 className="font-title text-h3 text-encre">Abonnements iCal</h2>
          <p className="mt-1 font-ui text-sm text-encre-doux">
            Crée une URL d&apos;abonnement en lecture seule (RDV confirmés et replanifiés) à coller
            dans Google&nbsp;Agenda, Apple&nbsp;Calendar, etc. L&apos;URL n&apos;est affichée
            qu&apos;une seule fois, à la création&nbsp;: copiez-la immédiatement.
          </p>
        </div>

        {revealed && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-md border border-or-profond/40 bg-creme/60 px-4 py-3"
          >
            <p className="font-ui text-sm font-medium text-encre">
              URL du lien « {revealed.label} » — copiez-la maintenant, elle ne sera plus affichée.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-sm bg-ivoire px-2 py-1 font-mono text-xs text-encre">
                {revealed.url}
              </code>
              <button
                type="button"
                onClick={() => void onCopyRevealed()}
                aria-live="polite"
                className="rounded-sm px-2 py-1 font-ui text-sm text-or-profond hover:underline focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
              >
                {copied ? "Copié" : "Copier l'URL"}
              </button>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="rounded-sm px-2 py-1 font-ui text-sm text-encre-doux hover:underline focus-visible:outline-2 focus-visible:outline-encre focus-visible:outline-offset-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        <form onSubmit={onCreate} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className={labelClass}>Libellé du lien</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Agenda Google de Sarah"
              className={`${fieldClass} w-full`}
            />
          </label>
          <Button type="submit" disabled={busy || label.trim() === ""}>
            Créer un lien
          </Button>
        </form>

        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-6 text-center">
            <p className="font-ui text-sm text-statut-annule">Impossible de charger les liens.</p>
            <Button variant="ghost" onClick={() => void load()}>
              Réessayer
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Spinner label="Chargement des liens…" />
          </div>
        ) : feeds.length === 0 ? (
          <p className="rounded-sm border border-sable bg-creme/50 px-3 py-4 text-center font-ui text-sm text-encre-doux">
            Aucun lien d&apos;abonnement pour le moment.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-sable/60">
            {feeds.map((feed) => {
              const revoked = feed.revokedAt !== null;
              return (
                <li key={feed.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-sm font-medium text-encre">
                      {feed.label}
                      {revoked && (
                        <span className="ml-2 rounded-sm bg-statut-annule-pale px-1.5 py-0.5 font-ui text-xs text-statut-annule">
                          Révoqué
                        </span>
                      )}
                    </p>
                    <p className="truncate font-ui text-xs text-encre-doux">
                      {revoked
                        ? `Révoqué le ${formatDateTime(feed.revokedAt)}`
                        : `Créé le ${formatDateTime(feed.createdAt)}`}
                    </p>
                  </div>
                  {!revoked && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void onRegenerate(feed)}
                        disabled={busy}
                        className="rounded-sm px-2 py-1 font-ui text-sm text-encre hover:text-or-profond hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                      >
                        Régénérer
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRevoke(feed)}
                        disabled={busy}
                        className="rounded-sm px-2 py-1 font-ui text-sm text-statut-annule hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-statut-annule focus-visible:outline-offset-2"
                      >
                        Révoquer
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}
