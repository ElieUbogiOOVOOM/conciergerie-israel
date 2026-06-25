import { RdvDetail } from "@/components/rdv/RdvDetail";

export default async function RendezVousDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RdvDetail id={id} />;
}
