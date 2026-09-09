import Link from "next/link";
import { Logo } from "@/components/Logo";

// This page has no per-request data, so Next would otherwise mark it fully
// static and send a year-long s-maxage - which Firebase Hosting's CDN then
// caches at the edge with no way to bust it on a redeploy short of a
// version change (see the Cloud Run + Firebase Hosting caching gotcha this
// fixes: a stale homepage kept being served after multiple deploys because
// of exactly this). Forcing it dynamic keeps every deploy visible immediately.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center border-t-4 border-rahoot-red bg-background px-6 py-16 text-rahoot-ink">
      <div className="w-full max-w-lg text-center">
        <h1 className="sr-only">Rahoot</h1>
        <Logo size={220} priority />
        <p className="mt-5 text-lg text-rahoot-muted">
          Playing a quiz someone shared, or building your own? No account needed either way.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/join" className="card flex flex-col p-6 text-center hover:border-rahoot-red">
            <h2 className="text-lg font-bold">Enter join code</h2>
            <p className="mt-1 flex-1 text-sm text-rahoot-muted">
              Got a code or a QR code from your teacher? Jump straight in.
            </p>
            <span className="btn btn-primary mt-4">Enter join code</span>
          </Link>
          <Link href="/homeworks/new" className="card flex flex-col p-6 text-center hover:border-rahoot-red">
            <h2 className="text-lg font-bold">Create homework</h2>
            <p className="mt-1 flex-1 text-sm text-rahoot-muted">
              Name it, add questions, get a join code - nothing to sign up for.
            </p>
            <span className="btn btn-outline mt-4">Create homework</span>
          </Link>
        </div>
      </div>

      <div className="mt-16 flex items-center gap-6 text-sm text-rahoot-muted">
        <Link href="/my-homeworks" className="hover:text-rahoot-ink hover:underline">
          My homeworks
        </Link>
        <Link href="/admin/login" className="hover:text-rahoot-ink hover:underline">
          Admin login
        </Link>
      </div>
    </div>
  );
}
