import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/next-auth";

const SECTIONS = [
  { href: "/admin/users", title: "Korisnici", desc: "Upravljanje korisnicima, rolama i 2FA statusom." },
  { href: "/admin/audit", title: "Audit log", desc: "Istorija mutacija, login događaja, GDPR operacija." },
  { href: "/admin/gdpr", title: "GDPR operacije", desc: "Pravo na pristup i pravo na zaborav." },
];

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const roles = (session as any)?.roles ?? [];
  if (!roles.some((r: any) => r.rola === "ADMIN")) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Administracija</h1>
      <p className="text-sm text-muted-foreground">
        Admin panel — upravljanje korisnicima, audit log, GDPR. Sistemska podešavanja i RBAC matrica dolaze u M9+M10.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-md border bg-card p-4 hover:bg-secondary/50">
            <div className="font-semibold">{s.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
