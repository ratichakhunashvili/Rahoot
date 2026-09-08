import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center border-t-4 border-rahoot-red bg-background px-6 py-16 text-rahoot-ink">
      <div className="w-full max-w-md text-center">
        <h1 className="sr-only">Rahoot</h1>
        <Logo size={220} priority className="shadow-lg" />
        <p className="mt-5 text-lg text-rahoot-muted">
          Scan the QR code your teacher shows you to jump straight in.
        </p>

        <div className="mt-10 card p-6 text-rahoot-ink">
          <h2 className="text-lg font-bold">No camera handy?</h2>
          <p className="mt-1 text-sm text-rahoot-muted">
            Enter the join code shown on screen instead.
          </p>
          <Link href="/join" className="btn btn-primary mt-4 w-full">
            Enter a join code
          </Link>
        </div>
      </div>

      <Link
        href="/admin/login"
        className="mt-16 text-sm text-rahoot-muted underline-offset-4 hover:text-rahoot-ink hover:underline"
      >
        Admin login
      </Link>
    </div>
  );
}
