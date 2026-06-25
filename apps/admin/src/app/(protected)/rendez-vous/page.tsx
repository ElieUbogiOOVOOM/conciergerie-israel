import { RdvListView } from "@/components/rdv/RdvListView";

/**
 * Liste des RDV. Lit un éventuel `dateFrom` de l'URL (lien « +N autres » du
 * planning) et le convertit en jour (YYYY-MM-DD) pour préremplir le filtre.
 */
export default async function RendezVousPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string }>;
}) {
  const { dateFrom } = await searchParams;
  const initialDateFrom = dateFrom ? dateFrom.slice(0, 10) : "";
  return <RdvListView initialDateFrom={initialDateFrom} />;
}
