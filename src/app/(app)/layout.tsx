import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/next-auth";
import { Sidebar } from "./dashboard/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const email = session.user?.email ?? "";
  const roles = ((session as any).roles ?? []) as Array<{ rola: string; pravnoLiceId: string }>;
  return (
    <div className="flex min-h-screen">
      <Sidebar email={email} roles={roles} />
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
