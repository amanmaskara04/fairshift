import { getRepos } from "@/server/repos";

/** Liveness plus a datastore round-trip time (reports only ok/error and latency, never connection details). */
export async function GET() {
  const backend = process.env.MONGODB_URI ? "mongodb" : "memory";
  const region = process.env.VERCEL_REGION ?? process.env.K_SERVICE ?? "local";
  try {
    await getRepos().orgs.getAll(); // first call also opens the pooled connection
    const started = Date.now();
    await getRepos().orgs.getAll();
    return Response.json({ status: "ok", db: backend, dbMs: Date.now() - started, region });
  } catch {
    return Response.json({ status: "degraded", db: backend, dbStatus: "error", region }, { status: 503 });
  }
}
