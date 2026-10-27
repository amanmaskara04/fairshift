import "server-only";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { getSeedData } from "../seed/data";
import type {
  Admin,
  FeedbackEntry,
  Hazard,
  Org,
  Repos,
  Shift,
  Site,
  Skill,
  Worker,
} from "./types";

/*
 * MongoDB implementation of the Repos interface (used when MONGODB_URI is set).
 * Documents use the entity id as _id. On first connection to an empty database
 * the deterministic demo seed is inserted, so a fresh Atlas cluster is demo-ready.
 */

type WithId<T> = T & { _id: string };

const globalMongo = globalThis as typeof globalThis & { __fairshiftMongo?: Promise<Db> };

async function connect(): Promise<Db> {
  const client = new MongoClient(process.env.MONGODB_URI!, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "fairshift");
  await ensureSeeded(db);
  return db;
}

/** One pooled client per server instance (survives hot reloads and warm serverless invocations). */
function db(): Promise<Db> {
  globalMongo.__fairshiftMongo ??= connect().catch((error) => {
    globalMongo.__fairshiftMongo = undefined;
    throw error;
  });
  return globalMongo.__fairshiftMongo;
}

async function ensureSeeded(database: Db): Promise<void> {
  if ((await database.collection("orgs").estimatedDocumentCount()) > 0) return;
  const seed = getSeedData();
  const insert = async <T extends { id: string }>(name: string, items: T[]) => {
    if (items.length) await database.collection(name).insertMany(items.map((item) => ({ _id: item.id, ...item }) as unknown as Document));
  };
  await Promise.all([
    insert("orgs", seed.orgs),
    insert("sites", seed.sites),
    insert("workers", seed.workers),
    insert("admins", seed.admins),
    insert("shifts", seed.shifts),
    insert("hazards", seed.hazards),
    insert("feedback", seed.feedback),
    insert("skills", seed.skills),
  ]);
  await Promise.all([
    database.collection("shifts").createIndex({ workerId: 1, inAt: 1 }),
    database.collection("shifts").createIndex({ siteId: 1 }),
    database.collection("hazards").createIndex({ orgId: 1 }),
    database.collection("feedback").createIndex({ orgId: 1, weekBucket: 1 }),
    database.collection("workers").createIndex({ code: 1 }, { unique: true }),
    database.collection("admins").createIndex({ email: 1 }, { unique: true }),
  ]);
}

async function col(name: string): Promise<Collection<Document>> {
  return (await db()).collection(name);
}

function strip<T>(doc: WithId<T> | null): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  void _id;
  return rest as T;
}

const stripAll = <T>(docs: WithId<T>[]): T[] => docs.map((d) => strip(d)!);

async function find<T>(name: string, filter: Document = {}): Promise<T[]> {
  return stripAll((await (await col(name)).find(filter).toArray()) as unknown as WithId<T>[]);
}

async function findOne<T>(name: string, filter: Document): Promise<T | undefined> {
  return strip((await (await col(name)).findOne(filter)) as unknown as WithId<T> | null);
}

async function insert<T extends { id: string }>(name: string, item: T): Promise<void> {
  await (await col(name)).insertOne({ _id: item.id, ...item } as unknown as Document);
}

async function update<T>(name: string, id: string, data: Partial<T>): Promise<void> {
  await (await col(name)).updateOne({ _id: id } as Document, { $set: data as Document });
}

export function createMongoRepos(): Repos {
  return {
    orgs: {
      getAll: () => find<Org>("orgs"),
      getById: (id) => findOne<Org>("orgs", { _id: id }),
    },
    sites: {
      getAll: () => find<Site>("sites"),
      getByOrg: (orgId) => find<Site>("sites", { orgId }),
      getById: (id) => findOne<Site>("sites", { _id: id }),
    },
    workers: {
      getAll: () => find<Worker>("workers"),
      getByOrg: (orgId) => find<Worker>("workers", { orgId }),
      getByCode: (code) => findOne<Worker>("workers", { code }),
      getById: (id) => findOne<Worker>("workers", { _id: id }),
    },
    admins: {
      getAll: () => find<Admin>("admins"),
      getByEmail: (email) => findOne<Admin>("admins", { email }),
      getById: (id) => findOne<Admin>("admins", { _id: id }),
    },
    shifts: {
      getAll: () => find<Shift>("shifts"),
      getByWorker: (workerId) => find<Shift>("shifts", { workerId }),
      getByWorkers: (workerIds) => find<Shift>("shifts", { workerId: { $in: workerIds } }),
      getByWorkerInRange: (workerId, from, to) => find<Shift>("shifts", { workerId, inAt: { $gte: from, $lte: to } }),
      getBySite: (siteId) => find<Shift>("shifts", { siteId }),
      create: (shift) => insert("shifts", shift),
      update: (id, data) => update<Shift>("shifts", id, data),
    },
    hazards: {
      getAll: () => find<Hazard>("hazards"),
      getByOrg: (orgId) => find<Hazard>("hazards", { orgId }),
      getById: (id) => findOne<Hazard>("hazards", { _id: id }),
      create: (hazard) => insert("hazards", hazard),
      update: (id, data) => update<Hazard>("hazards", id, data),
    },
    feedback: {
      getAll: () => find<FeedbackEntry>("feedback"),
      getByOrg: (orgId) => find<FeedbackEntry>("feedback", { orgId }),
      getByCohortAndWeek: (cohort, weekBucket) => find<FeedbackEntry>("feedback", { cohort, weekBucket }),
      create: (entry) => insert("feedback", entry),
    },
    skills: {
      getByWorker: (workerId) => find<Skill>("skills", { workerId }),
      create: (skill) => insert("skills", skill),
    },
    feedbackGuards: {
      has: async (key) => (await (await db()).collection("feedbackGuards").countDocuments({ _id: key } as Document, { limit: 1 })) > 0,
      add: async (key) => {
        await (await db()).collection("feedbackGuards").updateOne({ _id: key } as Document, { $setOnInsert: { at: new Date() } }, { upsert: true });
      },
    },
  };
}
