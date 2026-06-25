"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RendezVousDetail } from "@hymea/shared";
import { ApiError, getRendezVous } from "@/lib/api";
import { formatDateTime, formatTimeRange } from "@/lib/datetime";
import { typeClientLabel } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";

/** Ligne descriptive (libellé / valeur) de la fiche. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-sable/60 py-2.5 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="font-ui text-sm text-encre">{children}</dd>
    </div>
  );
}

/** Fiche détaillée d'un RDV (lecture seule), atteinte depuis le planning et la liste. */
export function RdvDetail({ id }: { id: string }) {
  const [rdv, setRdv] = useState<RendezVousDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let active = true;
    getRendezVous(id)
      .then((data) => {
        if (!active) return;
        setRdv(data);
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

  return (
    <section aria-label="Fiche rendez-vous" className="flex max-w-2xl flex-col gap-5">
      <Link href="/rendez-vous" className="font-ui text-sm text-or-profond hover:underline">
        ‹ Retour à la liste
      </Link>

      {status === "loading" && (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement de la fiche…" />
        </div>
      )}

      {status === "notfound" && (
        <p className="rounded-md border border-sable bg-ivoire px-4 py-8 text-center font-ui text-sm text-encre-doux">
          Ce rendez-vous est introuvable.
        </p>
      )}

      {status === "error" && (
        <p className="rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center font-ui text-sm text-statut-annule">
          Impossible de charger ce rendez-vous.
        </p>
      )}

      {status === "ok" && rdv && (
        <article className="rounded-md border border-sable bg-ivoire p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-sable pb-4">
            <h1 className="font-title text-h2 text-encre">
              {rdv.client.nom} {rdv.client.prenom}
            </h1>
            <StatusBadge statut={rdv.statut} />
          </header>

          <dl>
            <Row label="Créneau">
              {rdv.debut ? (
                <>
                  {formatDateTime(rdv.debut)}
                  {rdv.fin && (
                    <span className="text-encre-doux">
                      {" "}
                      ({formatTimeRange(rdv.debut, rdv.fin)})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-encre-doux">Sans créneau (demande à planifier)</span>
              )}
            </Row>
            <Row label="Prestation">{rdv.prestation.libelle.fr}</Row>
            <Row label="Type de client">{typeClientLabel[rdv.typeClient]}</Row>
            <Row label="Email">
              <a href={`mailto:${rdv.client.email}`} className="text-or-profond hover:underline">
                {rdv.client.email}
              </a>
            </Row>
            <Row label="Téléphone">
              <a href={`tel:${rdv.client.telephone}`} className="text-or-profond hover:underline">
                {rdv.client.telephone}
              </a>
            </Row>
            {rdv.adresse && <Row label="Adresse">{rdv.adresse}</Row>}
            {(rdv.surfaceM2 || rdv.nombrePieces) && (
              <Row label="Logement">
                {[
                  rdv.surfaceM2 ? `${rdv.surfaceM2} m²` : null,
                  rdv.nombrePieces
                    ? `${rdv.nombrePieces} pièce${rdv.nombrePieces > 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Row>
            )}
            <Row label="Intervenant">
              {rdv.intervenant ? (
                `${rdv.intervenant.nom}${rdv.intervenant.prenom ? ` ${rdv.intervenant.prenom}` : ""}`
              ) : (
                <span className="text-encre-doux">Non attribué</span>
              )}
            </Row>
            {rdv.message && <Row label="Message">{rdv.message}</Row>}
            <Row label="Demande reçue le">{formatDateTime(rdv.createdAt)}</Row>
          </dl>
        </article>
      )}
    </section>
  );
}
