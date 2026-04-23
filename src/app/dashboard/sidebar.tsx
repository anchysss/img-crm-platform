"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NotificationsBadge } from "./sidebar-notifications";

interface NavItem { href: string; label: string; }
interface NavSection { id: string; label: string; items: NavItem[]; adminOnly?: boolean; managerOnly?: boolean; financeOnly?: boolean; }

const SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    label: "1. Dashboard",
    items: [
      { href: "/dashboard", label: "Danas" },
      { href: "/notifications", label: "Notifikacije" },
    ],
  },
  {
    id: "mediabook",
    label: "2. MediaBook plan",
    items: [
      { href: "/mediabook", label: "MediaBook plan" },
    ],
  },
  {
    id: "prodaja",
    label: "3. Prodaja",
    items: [
      { href: "/prodaja/pipeline", label: "Pipeline (pipeline)" },
      { href: "/prodaja/ponude", label: "Prilike / Ponude" },
      { href: "/prodaja/partneri", label: "Partneri / Klijenti" },
      { href: "/prodaja/cenovnik", label: "Cenovnik" },
      { href: "/prodaja/paketi", label: "Paketi" },
      { href: "/prodaja/planovi", label: "Planovi rada" },
    ],
  },
  {
    id: "logistika",
    label: "4. Logistika",
    items: [
      { href: "/logistika/radni-nalozi", label: "Radni nalozi" },
      { href: "/logistika/vozila", label: "Vozila" },
      { href: "/logistika/partneri", label: "Partneri (agencije prevoza)" },
      { href: "/logistika/kampanje", label: "Kampanje" },
    ],
  },
  {
    id: "finansije",
    label: "5. Finansije",
    items: [
      { href: "/finansije/plan-fakturisanja", label: "Plan fakturisanja" },
      { href: "/finansije/fakture", label: "Fakture / Predračuni" },
      { href: "/finansije/handoff", label: "ERP handoff" },
    ],
  },
  {
    id: "izvestaji",
    label: "6. Izveštaji",
    items: [
      { href: "/izvestaji", label: "Svi izveštaji" },
    ],
  },
  {
    id: "admin",
    label: "7. Administracija",
    adminOnly: true,
    items: [
      { href: "/admin/users", label: "Korisnici" },
      { href: "/admin/audit", label: "Audit log" },
      { href: "/admin/gdpr", label: "GDPR operacije" },
    ],
  },
];

export function Sidebar({ email, roles }: { email: string; roles: Array<{ rola: string; pravnoLiceId: string }> }) {
  const pathname = usePathname() ?? "";
  const isAdmin = roles.some((r) => r.rola === "ADMIN");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <aside className="w-64 shrink-0 border-r bg-secondary/40 p-3">
      <div className="mb-4 px-2">
        <div className="text-sm font-semibold tracking-tight">IMG CRM</div>
        <div className="text-xs text-muted-foreground truncate">{email}</div>
      </div>

      <nav className="flex flex-col gap-0.5 text-sm">
        {visibleSections.map((section) => {
          const isOpen = !collapsed[section.id];
          const hasActive = section.items.some((it) => pathname.startsWith(it.href));
          return (
            <div key={section.id} className="mb-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${hasActive ? "text-primary" : "text-muted-foreground"} hover:bg-secondary`}
              >
                <span>{section.label}</span>
                <span className="text-xs">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
                  {section.items.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + "/");
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`flex items-center rounded-md px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                      >
                        <span className="flex-1">{it.label}</span>
                        {it.href === "/notifications" && <NotificationsBadge />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 border-t pt-3">
        <Link href="/profile" className="block rounded-md px-3 py-2 text-sm hover:bg-secondary">Profil</Link>
        <Link href="/api/auth/signout" className="mt-1 block rounded-md border px-3 py-2 text-center text-sm hover:bg-secondary">Odjava</Link>
      </div>
    </aside>
  );
}
