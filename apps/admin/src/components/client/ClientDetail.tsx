"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Client, RendezVous } from "@hymea/shared";
import { ApiError, anonymizeClient, deleteClient, getClientHistorique } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { typeClientLabel } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Ligne descriptive (libellé / valeur) de la fiche. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-sable/60 py-2.5 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="font-ui text-sm text-encre">{children}</dd>
    </div>
  );
}

type DialogKind = "anonymize" | "delete" | null;

/** Fiche client consolidée (#37) : coordonnées, historique RDV, actions RGPD. */
export function ClientDetail({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<RendezVous[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getClientHistorique(id)
      .then((data) => {
        if (!active) return;
        setClient(data.client);
        setHistory(data.rendezVous);
        setStatus("ok");
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function onAnonymize() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await anonymizeClient(id);
      setClient(updated);
      setDialog(null);
    } catch {
      setActionError("L'anonymisation a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setActionError(null);
    try {
      await deleteClient(id);
      router.push("/clients");
    } catch {
      setActionError("La suppression a échoué. Réessayez.");
      setBusy(false);
    }
  }

  const anonymized = Boolean(client?.anonymizedAt);

  return (
    <section aria-label="Fiche client" className="flex max-w-3xl flex-col gap-5">
      <Link href="/clients" className="font-ui text-sm text-or-profond hover:underline">
        ‹ Retour aux clients
      </Link>

      {status === "loading" && (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement de la fiche…" />
        </div>
      )}

      {status === "notfound" && (
        <p className="rounded-md border border-sable bg-ivoire px-4 py-8 text-center font-ui text-sm text-encre-doux">
          Ce client est introuvable.
        </p>
      )}

      {status === "error" && (
        <p className="rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center font-ui text-sm text-statut-annule">
          Impossible de charger ce client.
        </p>
      )}

      {status === "ok" && client && (
        <>
          <article className="rounded-md border border-sable bg-ivoire p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-sable pb-4">
              <h1 className="font-title text-h2 text-encre">
                {client.nom} {client.prenom}
              </h1>
              {anonymized && (
                <span className="rounded-full bg-sable px-2.5 py-0.5 font-ui text-xs font-medium text-encre-doux">
                  Anonymisé
                </span>
              )}
            </header>

            <dl>
              <Row label="Email">
                {anonymized ? (
                  <span className="text-encre-doux">—</span>
                ) : (
                  <a href={`mailto:${client.email}`} className="text-or-profond hover:underline">
                    {client.email}
                  </a>
                )}
              </Row>
              <Row label="Téléphone">
                {anonymized ? (
                  <span className="text-encre-doux">—</span>
                ) : (
                  <a href={`tel:${client.telephone}`} className="text-or-profond hover:underline">
                    {client.telephone}
                  </a>
                )}
              </Row>
              <Row label="Langue">{client.locale.toUpperCase()}</Row>
              <Row label="Fiche créée le">{formatDateTime(client.createdAt)}</Row>
              {client.anonymizedAt && (
                <Row label="Anonymisé le">{formatDateTime(client.anonymizedAt)}</Row>
              )}
            </dl>
          </article>

          {/* Historique des RDV */}
          <article
            aria-label="Historique des rendez-vous"
            className="rounded-md border border-sable bg-ivoire p-5"
          >
            <h2 className="mb-3 font-title text-h3 text-encre">Historique des rendez-vous</h2>
            {history.length === 0 ? (
              <p className="font-ui text-sm text-encre-doux">Aucun rendez-vous enregistré.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-sable/60">
                {history.map((rdv) => (
                  <li
                    key={rdv.id}
                    data-testid="history-row"
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <Link
                      href={`/rendez-vous/${rdv.id}`}
                      className="font-ui text-sm text-encre hover:text-or-profond hover:underline"
                    >
                      {rdv.debut ? formatDateTime(rdv.debut) : "Sans créneau"}
                      <span className="ml-2 text-xs text-encre-doux">
                        {typeClientLabel[rdv.typeClient]}
                      </span>
                    </Link>
                    <StatusBadge statut={rdv.statut} />
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Actions RGPD */}
          <article
            aria-label="Actions RGPD"
            className="rounded-md border border-statut-annule/30 bg-statut-annule-pale/40 p-5"
          >
            <h2 className="font-title text-h3 text-encre">Données personnelles (RGPD)</h2>
            <p className="mt-2 font-ui text-sm leading-relaxed text-encre-doux">
              L’anonymisation efface les coordonnées du client mais conserve l’historique des
              rendez-vous. La suppression efface définitivement le client et tous ses rendez-vous.
            </p>
            {actionError && (
              <p role="alert" className="mt-3 font-ui text-sm text-statut-annule">
                {actionError}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                disabled={anonymized}
                onClick={() => {
                  setActionError(null);
                  setDialog("anonymize");
                }}
              >
                {anonymized ? "Déjà anonymisé" : "Anonymiser"}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setActionError(null);
                  setDialog("delete");
                }}
              >
                Supprimer définitivement
              </Button>
            </div>
          </article>

          <ConfirmDialog
            open={dialog === "anonymize"}
            title="Anonymiser ce client ?"
            description="Les coordonnées (nom, prénom, email, téléphone) seront définitivement effacées. L'historique des rendez-vous est conservé."
            confirmLabel="Anonymiser"
            busy={busy}
            onCancel={() => setDialog(null)}
            onConfirm={onAnonymize}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            title="Supprimer ce client ?"
            description="Le client et l'intégralité de ses rendez-vous seront définitivement supprimés. Cette action est irréversible."
            confirmLabel="Supprimer définitivement"
            destructive
            busy={busy}
            onCancel={() => setDialog(null)}
            onConfirm={onDelete}
          />
        </>
      )}
    </section>
  );
}
