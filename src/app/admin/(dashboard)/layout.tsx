import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { LogoMark } from "@/components/Logo";
import { logout } from "./actions";

// Second line of defense behind proxy.ts (see the Next.js auth guide's
// recommendation to not rely on Proxy alone): every server render under the
// dashboard re-checks the session before touching any admin data.
export default async function AdminDashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b-4 border-rahoot-red bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2 text-2xl font-black text-rahoot-red">
            <LogoMark size={26} />
            Rahoot <span className="text-rahoot-ink">admin</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="btn btn-outline !py-2 !px-4 text-sm">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
