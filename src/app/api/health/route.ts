import { getRepos } from "@/server/repos";

/** Liveness plus a datastore check (reports only ok/error, never connection details). */
export async function GET() {
  const backend = process.env.MONGODB_URI ? "mongodb" : "memory";
  try {
    await getRepos().orgs.getAll();
    return Response.json({ status: "ok", db: backend });
  } catch {
    return Response.json({ status: "degraded", db: backend, dbStatus: "error" }, { status: 503 });
  }
}
