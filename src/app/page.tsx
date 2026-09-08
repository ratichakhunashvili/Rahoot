import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-rahoot-red px-6 py-16 text-[#1a1005]">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3">
          <LogoMark size={56} variant="bolt" />
          <h1 className="text-6xl font-black tracking-tight">Rahoot</h1>
        </div>
        <p className="mt-3 text-lg text-[#1a1005]/70">
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
        className="mt-16 text-sm text-[#1a1005]/70 underline-offset-4 hover:underline"
      >
        Admin login
      </Link>
    </div>
  );
}
