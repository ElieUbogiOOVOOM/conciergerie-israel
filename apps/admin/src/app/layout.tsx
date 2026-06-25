import type { Metadata } from "next";
import { fontVariables } from "@/fonts";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Le back-office ne doit JAMAIS être indexé (défense en profondeur avec le
// header X-Robots-Tag posé par next.config + middleware).
export const metadata: Metadata = {
  title: "HYMEA — Back-office",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
