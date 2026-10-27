/**
 * In-memory repository implementation.
 * Seeded on first use from seed data.
 */
import {
  Repos,
  Org, Site, Worker, Admin, Shift, Hazard, FeedbackEntry, Skill,
  OrgRepo, SiteRepo, WorkerRepo, AdminRepo, ShiftRepo, HazardRepo, FeedbackRepo, SkillRepo, FeedbackGuardRepo,
} from "./types";
import { getSeedData } from "../seed/data";

interface MemoryStore {
  orgs: Org[];
  sites: Site[];
  workers: Worker[];
  admins: Admin[];
  shifts: Shift[];
  hazards: Hazard[];
  feedback: FeedbackEntry[];
  skills: Skill[];
  feedbackGuards: Set<string>;
}

// Kept on globalThis so every route bundle in the Node process shares one store.
const globalStore = globalThis as typeof globalThis & { __fairshiftStore?: MemoryStore };

function getStore(): MemoryStore {
  globalStore.__fairshiftStore ??= getSeedData();
  return globalStore.__fairshiftStore;
}

/** Test helper: drop the store so the next access reseeds. */
export function resetMemoryStore(): void {
  globalStore.__fairshiftStore = undefined;
}

class MemoryOrgRepo implements OrgRepo {
  async getAll() { return getStore().orgs; }
  async getById(id: string) { return getStore().orgs.find((o) => o.id === id); }
}

class MemorySiteRepo implements SiteRepo {
  async getAll() { return getStore().sites; }
  async getByOrg(orgId: string) { return getStore().sites.filter((s) => s.orgId === orgId); }
  async getById(id: string) { return getStore().sites.find((s) => s.id === id); }
}

class MemoryWorkerRepo implements WorkerRepo {
  async getAll() { return getStore().workers; }
  async getByOrg(orgId: string) { return getStore().workers.filter((w) => w.orgId === orgId); }
  async getByCode(code: string) { return getStore().workers.find((w) => w.code === code); }
  async getById(id: string) { return getStore().workers.find((w) => w.id === id); }
}

class MemoryAdminRepo implements AdminRepo {
  async getAll() { return getStore().admins; }
  async getByEmail(email: string) { return getStore().admins.find((a) => a.email === email); }
  async getById(id: string) { return getStore().admins.find((a) => a.id === id); }
}

class MemoryShiftRepo implements ShiftRepo {
  async getAll() { return getStore().shifts; }
  async getByWorker(workerId: string) {
    return getStore().shifts.filter((s) => s.workerId === workerId);
  }
  async getByWorkers(workerIds: string[]) {
    const ids = new Set(workerIds);
    return getStore().shifts.filter((s) => ids.has(s.workerId));
  }
  async getByWorkerInRange(workerId: string, from: Date, to: Date) {
    return getStore().shifts.filter(
      (s) => s.workerId === workerId && s.inAt >= from && s.inAt <= to
    );
  }
  async getBySite(siteId: string) {
    return getStore().shifts.filter((s) => s.siteId === siteId);
  }
  async create(shift: Shift) { getStore().shifts.push(shift); }
  async update(id: string, data: Partial<Shift>) {
    const idx = getStore().shifts.findIndex((s) => s.id === id);
    if (idx !== -1) {
      getStore().shifts[idx] = { ...getStore().shifts[idx], ...data };
    }
  }
}

class MemoryHazardRepo implements HazardRepo {
  async getAll() { return getStore().hazards; }
  async getByOrg(orgId: string) {
    return getStore().hazards.filter((h) => h.orgId === orgId);
  }
  async getById(id: string) { return getStore().hazards.find((h) => h.id === id); }
  async create(hazard: Hazard) { getStore().hazards.push(hazard); }
  async update(id: string, data: Partial<Hazard>) {
    const idx = getStore().hazards.findIndex((h) => h.id === id);
    if (idx !== -1) {
      getStore().hazards[idx] = { ...getStore().hazards[idx], ...data };
    }
  }
}

class MemoryFeedbackRepo implements FeedbackRepo {
  async getAll() { return getStore().feedback; }
  async getByOrg(orgId: string) {
    return getStore().feedback.filter((f) => f.orgId === orgId);
  }
  async getByCohortAndWeek(cohort: string, weekBucket: string) {
    return getStore().feedback.filter(
      (f) => f.cohort === cohort && f.weekBucket === weekBucket
    );
  }
  async create(entry: FeedbackEntry) { getStore().feedback.push(entry); }
}

class MemorySkillRepo implements SkillRepo {
  async getByWorker(workerId: string) {
    return getStore().skills.filter((s) => s.workerId === workerId);
  }
  async create(skill: Skill) { getStore().skills.push(skill); }
}

class MemoryFeedbackGuardRepo implements FeedbackGuardRepo {
  async has(key: string) { return getStore().feedbackGuards.has(key); }
  async add(key: string) { getStore().feedbackGuards.add(key); }
}

export function createMemoryRepos(): Repos {
  return {
    orgs: new MemoryOrgRepo(),
    sites: new MemorySiteRepo(),
    workers: new MemoryWorkerRepo(),
    admins: new MemoryAdminRepo(),
    shifts: new MemoryShiftRepo(),
    hazards: new MemoryHazardRepo(),
    feedback: new MemoryFeedbackRepo(),
    skills: new MemorySkillRepo(),
    feedbackGuards: new MemoryFeedbackGuardRepo(),
  };
}
