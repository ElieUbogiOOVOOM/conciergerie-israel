import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Helpers de navigation conscients de la locale : Link, useRouter, usePathname,
// redirect et getPathname conservent et appliquent automatiquement le préfixe
// de langue courant. À utiliser partout à la place des équivalents next/navigation.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
