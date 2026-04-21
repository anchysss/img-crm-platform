import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/next-auth";

const NAV = [
  { href: "/dashboard", label: "Danas" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/partners", label: "Partneri" },
  { href: "/mediabook", label: "MediaBook" },
  { href: "/vehicles", label: "Vozila" },
  { href: "/campaigns", label: "Kampanje" },
  { href: "/invoices", label: "Fakture" },
  { href: "/reports", label: "Izveštaji" },
  { href: "/notifications", label: "Notifikacije" },
  { href: "/admin", label: "Admin" },
  { href: "/profile", label: "Profil" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-secondary/40 p-4">
        <div className="mb-6 text-sm font-semibold tracking-tight">
          IMG CRM
          <div className="text-xs font-normal text-muted-foreground">
            {session.user?.email}
          </div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/api/auth/signout"
          className="mt-6 block rounded-md border px-3 py-2 text-center text-sm hover:bg-secondary"
        >
          Odjava
        </Link>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
