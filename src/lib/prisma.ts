import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// A driver adapter (rather than Prisma's classic binary query engine) so
// there's no platform-specific `.so.node` binary to bundle into a Vercel
// Function - that binary bundling is what silently breaks ("could not
// locate the Query Engine for runtime...") on Vercel with a custom
// generator output path. The adapter talks to Postgres over the `pg`
// driver directly instead.
//
// Supabase's pooler (aws-0-*.pooler.supabase.com) doesn't send a chain
// Node's default CA bundle can verify, so `pg` fails with "self-signed
// certificate in certificate chain" unless told not to reject it - the
// connection is still encrypted (TLS, not plaintext), this only skips
// validating the certificate chain, which is the standard workaround for
// this exact Supabase+pg combination. `pg` derives its own SSL behavior from
// a `sslmode` query param on the connection string when one is present,
// which otherwise silently overrides (not merges with) the explicit `ssl`
// option below - so that param has to be stripped for the override to apply.
const connectionUrl = new URL(process.env.POSTGRES_PRISMA_URL ?? "");
connectionUrl.searchParams.delete("sslmode");
const adapter = new PrismaPg({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

// Reuse a single PrismaClient across hot-reloads in dev so we don't exhaust
// the database's connection limit every time a route file reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
