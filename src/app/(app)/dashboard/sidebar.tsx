"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationsBadge } from "./sidebar-notifications";

interface NavItem { href: string; label: string; }
interface NavSection { title: string; items: NavItem[]; adminOnly?: boolean; }

const SECTIONS: NavSection[] = [
  {
    title: "",
    items: [
      { href: "/dashboard", label: "🏠  Danas" },
      { href: "/notifications", label: "🔔  Notifikacije" },
    ],
  },
  {
    title: "Prodaja",
    items: [
      { href: "/prodaja/kontakti", label: "👥  Kontakti / Klijenti" },
      { href: "/prodaja/prilike", label: "🎯  Prilike" },
      { href: "/prodaja/ponude", label: "📄  Ponude" },
      { href: "/prodaja/cenovnik", label: "💰  Cenovnik & Paketi" },
      { href: "/prodaja/planovi", label: "📅  Plan rada" },
    ],
  },
  {
    title: "Logistika",
    items: [
      { href: "/logistika/radni-nalozi", label: "📋  Radni nalozi" },
      { href: "/logistika/mediabook", label: "🗓️  Kampanje" },
      { href: "/logistika/vozila", label: "🚌  Vozila" },
      { href: "/logistika/sifarnici", label: "📚  Šifarnici" },
    ],
  },
  {
    title: "Finansije",
    items: [
      { href: "/finansije/plan-fakturisanja", label: "📊  Plan fakturisanja" },
      { href: "/finansije/fakture", label: "🧾  Fakture" },
    ],
  },
  {
    title: "Analitika",
    items: [{ href: "/izvestaji", label: "📈  Izveštaji" }],
  },
  {
    title: "Sistem",
    adminOnly: true,
    items: [
      { href: "/admin/users", label: "👤  Korisnici" },
      { href: "/admin/audit", label: "🔐  Audit log" },
      { href: "/admin/gdpr", label: "🛡️  GDPR" },
    ],
  },
];

export function Sidebar({ email, roles }: { email: string; roles: Array<{ rola: string; pravnoLiceId: string }> }) {
  const pathname = usePathname() ?? "";
  const isAdmin = roles.some((r) => r.rola === "ADMIN");
  const visible = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <aside className="w-60 shrink-0 border-r bg-secondary/40 p-3">
      <div className="mb-4 px-2">
        <div className="text-base font-bold tracking-tight">IMG CRM</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{email}</div>
      </div>

      <nav className="flex flex-col gap-4 text-sm">
        {visible.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] ${
                      active ? "bg-primary text-primary-foreground font-medium" : "text-foreground/80 hover:bg-secondary"
                    }`}
                  >
                    <span className="flex-1">{it.label}</span>
                    {it.href === "/notifications" && <NotificationsBadge />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t pt-3">
        <Link href="/profile" className="block rounded-md px-3 py-1.5 text-[13px] hover:bg-secondary">⚙️  Profil</Link>
        <Link href="/api/auth/signout" className="mt-1 block rounded-md border px-3 py-1.5 text-center text-[13px] hover:bg-secondary">
          Odjava
        </Link>
      </div>
    </aside>
  );
}
