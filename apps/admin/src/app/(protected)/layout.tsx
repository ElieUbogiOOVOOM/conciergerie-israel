import { AdminShell } from "@/components/layout/AdminShell";

/** Toutes les pages de ce groupe sont rendues dans la coquille authentifiée. */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
