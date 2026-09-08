import Link from "next/link";
import { Logo } from "@/components/Logo";
import { login } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const from = typeof params?.from === "string" ? params.from : "/admin";
  const hasError = params?.error === "invalid";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo size="md" className="justify-center" />
          </Link>
          <h1 className="mt-4 text-xl font-bold">Admin login</h1>
        </div>

        <form action={login} className="mt-8 flex flex-col gap-3">
          <input type="hidden" name="from" value={from} />
          <label className="text-sm font-semibold">
            Email
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="username"
              className="input mt-1"
            />
          </label>
          <label className="text-sm font-semibold">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="input mt-1"
            />
          </label>
          {hasError && (
            <p className="text-sm font-medium text-rahoot-red">
              Incorrect email or password.
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-2">
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
