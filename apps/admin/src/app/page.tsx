import { redirect } from "next/navigation";

/** Racine du back-office : redirige vers le planning (vue principale). */
export default function HomePage() {
  redirect("/planning");
}
