/**
 * Repository interfaces for FairShift data layer.
 * Implementations can be in-memory (dev) or Firestore (production).
 */

export interface Org {
  id: string;
  name: string;
  sector: "construction" | "hospital" | "campus" | "factory";
  labourRules: {
    dailyHrs: number;
    weeklyHrs: number;
    otMultiplier: number;
  };
}

export interface Site {
  id: string;
  orgId: string;
  name: string;
  sector: "construction" | "hospital" | "campus" | "factory";
  geofence?: { lat: number; lng: number; radiusM: number };
  qrSecret: string;
}

export interface Worker {
  id: string;
  orgId: string;
  siteId: string;
  name: string;
  code: string;
  pinHash: string;
  pinSalt: string;
  lang: string;
  role: "worker";
  pay: {
    basis: "daily" | "monthly" | "hourly";
    rate: number; // paise
  };
  joinedAt: Date;
}

export interface Admin {
  id: string;
  orgId: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "admin";
  siteIds: string[];
}

import type { Shift } from "@/core/types";

export type { Shift };

export interface Hazard {
  id: string;
  siteId: string;
  orgId: string;
  reporterId: string | null;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  transcript?: string;
  transcriptEn?: string;
  location?: string;
  photoDataUrl?: string;
  status: "received" | "in_progress" | "fixed" | "dismissed";
  assigneeUid?: string;
  timeline: { status: string; at: Date; by?: string }[];
  createdAt: Date;
}

export interface FeedbackEntry {
  id: string;
  orgId: string;
  siteId: string;
  cohort: string;
  weekBucket: string;
  scores: { pay: number; safety: number; respect: number };
  comment?: string;
  themes?: string[];
  sentiment?: number;
  createdAt: Date;
  // NO workerId — anonymity by design
}

export interface Skill {
  id: string;
  workerId: string;
  title: string;
  issuer: string;
  date: Date;
  verifiedBy?: string;
  evidence?: string;
}

export interface OrgRepo {
  getAll(): Promise<Org[]>;
  getById(id: string): Promise<Org | undefined>;
}

export interface SiteRepo {
  getAll(): Promise<Site[]>;
  getByOrg(orgId: string): Promise<Site[]>;
  getById(id: string): Promise<Site | undefined>;
}

export interface WorkerRepo {
  getAll(): Promise<Worker[]>;
  getByOrg(orgId: string): Promise<Worker[]>;
  getByCode(code: string): Promise<Worker | undefined>;
  getById(id: string): Promise<Worker | undefined>;
}

export interface AdminRepo {
  getAll(): Promise<Admin[]>;
  getByEmail(email: string): Promise<Admin | undefined>;
  getById(id: string): Promise<Admin | undefined>;
}

export interface ShiftRepo {
  getAll(): Promise<Shift[]>;
  getByWorker(workerId: string): Promise<Shift[]>;
  /** One query for many workers (avoids N+1 round trips on dashboards). */
  getByWorkers(workerIds: string[]): Promise<Shift[]>;
  getByWorkerInRange(workerId: string, from: Date, to: Date): Promise<Shift[]>;
  getBySite(siteId: string): Promise<Shift[]>;
  create(shift: Shift): Promise<void>;
  update(id: string, data: Partial<Shift>): Promise<void>;
}

export interface HazardRepo {
  getAll(): Promise<Hazard[]>;
  getByOrg(orgId: string): Promise<Hazard[]>;
  getById(id: string): Promise<Hazard | undefined>;
  create(hazard: Hazard): Promise<void>;
  update(id: string, data: Partial<Hazard>): Promise<void>;
}

export interface FeedbackRepo {
  getAll(): Promise<FeedbackEntry[]>;
  getByOrg(orgId: string): Promise<FeedbackEntry[]>;
  getByCohortAndWeek(cohort: string, weekBucket: string): Promise<FeedbackEntry[]>;
  create(entry: FeedbackEntry): Promise<void>;
}

/** One-way HMAC keys that stop double voting without storing who voted. */
export interface FeedbackGuardRepo {
  has(key: string): Promise<boolean>;
  add(key: string): Promise<void>;
}

export interface SkillRepo {
  getByWorker(workerId: string): Promise<Skill[]>;
  create(skill: Skill): Promise<void>;
}

export interface Repos {
  orgs: OrgRepo;
  sites: SiteRepo;
  workers: WorkerRepo;
  admins: AdminRepo;
  shifts: ShiftRepo;
  hazards: HazardRepo;
  feedback: FeedbackRepo;
  skills: SkillRepo;
  feedbackGuards: FeedbackGuardRepo;
}
