/**
 * Deterministic seed data for FairShift.
 * Uses a seeded PRNG — no Math.random().
 */
import { scryptSync } from "node:crypto";
import { Org, Site, Worker, Admin, Shift, Hazard, FeedbackEntry, Skill } from "../repos/types";

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashPin(pin: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(pin, salt, 64).toString("hex");
}

function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(password, salt, 64).toString("hex");
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight in IST (as a UTC instant) for the IST calendar day containing `d`. */
function istMidnight(d: Date): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
}

/** Day of week (0 = Sunday) in IST. */
function istDayOfWeek(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MS).getUTCDay();
}

// Fixed salts for deterministic hashing
const SALTS = {
  ramesh: "a1b2c3d4e5f60001",
  sunita: "a1b2c3d4e5f60002",
  w1003: "a1b2c3d4e5f60003",
  w1004: "a1b2c3d4e5f60004",
  w1005: "a1b2c3d4e5f60005",
  w1006: "a1b2c3d4e5f60006",
  w2003: "a1b2c3d4e5f60007",
  w2004: "a1b2c3d4e5f60008",
  w2005: "a1b2c3d4e5f60009",
  w2006: "a1b2c3d4e5f6000a",
  w2007: "a1b2c3d4e5f6000b",
  w2008: "a1b2c3d4e5f6000c",
  priya: "a1b2c3d4e5f60101",
  arjun: "a1b2c3d4e5f60102",
};

export function getSeedData() {
  const rand = mulberry32(42);
  const now = new Date();

  // ── Orgs ──
  const orgs: Org[] = [
    {
      id: "org1",
      name: "BuildRight Constructions",
      sector: "construction",
      labourRules: { dailyHrs: 8, weeklyHrs: 48, otMultiplier: 2 },
    },
    {
      id: "org2",
      name: "City Care Hospital",
      sector: "hospital",
      labourRules: { dailyHrs: 8, weeklyHrs: 48, otMultiplier: 2 },
    },
  ];

  // ── Sites ──
  const sites: Site[] = [
    {
      id: "site1",
      orgId: "org1",
      name: "Velachery Tower Site, Chennai",
      sector: "construction",
      geofence: { lat: 12.9815, lng: 80.2176, radiusM: 200 },
      qrSecret: "qr-secret-site1-abcdef1234567890",
    },
    {
      id: "site2",
      orgId: "org2",
      name: "Ward A",
      sector: "hospital",
      qrSecret: "qr-secret-site2-abcdef1234567890",
    },
    {
      id: "site3",
      orgId: "org2",
      name: "Ward B",
      sector: "hospital",
      qrSecret: "qr-secret-site3-abcdef1234567890",
    },
  ];

  // ── Workers ──
  const workerData: Array<{
    id: string; orgId: string; siteId: string; name: string;
    code: string; pin: string; saltKey: keyof typeof SALTS;
    lang: string; payBasis: "daily" | "monthly" | "hourly"; rate: number;
  }> = [
    // BuildRight (org1) — 6 workers
    { id: "w1001", orgId: "org1", siteId: "site1", name: "Ramesh Kumar", code: "1001", pin: "1234", saltKey: "ramesh", lang: "ta", payBasis: "daily", rate: 80000 },
    { id: "w1002", orgId: "org1", siteId: "site1", name: "Arun Patel", code: "1002", pin: "5678", saltKey: "w1003", lang: "hi", payBasis: "daily", rate: 75000 },
    { id: "w1003", orgId: "org1", siteId: "site1", name: "Venkat Rao", code: "1003", pin: "9012", saltKey: "w1004", lang: "te", payBasis: "daily", rate: 70000 },
    { id: "w1004", orgId: "org1", siteId: "site1", name: "Dinesh Singh", code: "1004", pin: "3456", saltKey: "w1005", lang: "hi", payBasis: "daily", rate: 72000 },
    { id: "w1005", orgId: "org1", siteId: "site1", name: "Manoj Kumar", code: "1005", pin: "7890", saltKey: "w1006", lang: "ta", payBasis: "daily", rate: 78000 },
    { id: "w1006", orgId: "org1", siteId: "site1", name: "Ravi Sharma", code: "1006", pin: "2345", saltKey: "w2007", lang: "en", payBasis: "daily", rate: 80000 },
    // City Care (org2) — 6 workers
    { id: "w2001", orgId: "org2", siteId: "site2", name: "Sunita Devi", code: "2001", pin: "1234", saltKey: "sunita", lang: "hi", payBasis: "monthly", rate: 1800000 },
    { id: "w2002", orgId: "org2", siteId: "site2", name: "Meena Kumari", code: "2002", pin: "5678", saltKey: "w2003", lang: "hi", payBasis: "monthly", rate: 1700000 },
    { id: "w2003", orgId: "org2", siteId: "site2", name: "Lakshmi Bai", code: "2003", pin: "9012", saltKey: "w2004", lang: "ta", payBasis: "monthly", rate: 1650000 },
    { id: "w2004", orgId: "org2", siteId: "site3", name: "Pooja Yadav", code: "2004", pin: "3456", saltKey: "w2005", lang: "hi", payBasis: "monthly", rate: 1750000 },
    { id: "w2005", orgId: "org2", siteId: "site3", name: "Kavita Rani", code: "2005", pin: "7890", saltKey: "w2006", lang: "en", payBasis: "monthly", rate: 1900000 },
    { id: "w2006", orgId: "org2", siteId: "site3", name: "Anita Sharma", code: "2006", pin: "2345", saltKey: "w2008", lang: "hi", payBasis: "monthly", rate: 1800000 },
  ];

  const workers: Worker[] = workerData.map((wd) => ({
    id: wd.id,
    orgId: wd.orgId,
    siteId: wd.siteId,
    name: wd.name,
    code: wd.code,
    pinHash: hashPin(wd.pin, SALTS[wd.saltKey]),
    pinSalt: SALTS[wd.saltKey],
    lang: wd.lang,
    role: "worker" as const,
    pay: { basis: wd.payBasis, rate: wd.rate },
    joinedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
  }));

  // ── Admins ──
  const admins: Admin[] = [
    {
      id: "admin1",
      orgId: "org1",
      name: "Priya Menon",
      email: "priya@buildright.demo",
      passwordHash: hashPassword("demo1234", SALTS.priya),
      passwordSalt: SALTS.priya,
      role: "admin",
      siteIds: ["site1"],
    },
    {
      id: "admin2",
      orgId: "org2",
      name: "Dr. Arjun Patel",
      email: "arjun@citycare.demo",
      passwordHash: hashPassword("demo1234", SALTS.arjun),
      passwordSalt: SALTS.arjun,
      role: "admin",
      siteIds: ["site2", "site3"],
    },
  ];

  // ── Shifts (3 weeks relative to now) ──
  const shifts: Shift[] = [];
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  // Generate shifts for the last 21 days
  for (let dayOffset = -21; dayOffset < 0; dayOffset++) {
    const dayStart = istMidnight(new Date(now.getTime() + dayOffset * MS_PER_DAY));

    // Ramesh: regular shifts, with some overtime days (10-11h)
    if (dayOffset !== -7 && dayOffset !== -14) {
      // Skip 2 days for variety — but Ramesh is mostly consistent
      const shiftStart = new Date(dayStart.getTime() + 7 * MS_PER_HOUR); // 7 AM
      const isOvertimeDay = dayOffset === -1 || dayOffset === -3 || dayOffset === -5 || dayOffset === -8;
      const shiftHours = isOvertimeDay ? 10 + rand() : 8 + rand() * 0.5;
      const shiftEnd = new Date(shiftStart.getTime() + shiftHours * MS_PER_HOUR);
      shifts.push({
        id: `shift-ramesh-${Math.abs(dayOffset)}`,
        workerId: "w1001",
        siteId: "site1",
        inAt: shiftStart,
        outAt: shiftEnd,
        method: "qr",
      });
    }

    // Sunita: rotating shifts, with 3 consecutive night shifts and a short rest gap
    const sunitaDayOfWeek = istDayOfWeek(dayStart); // 0=Sun
    if (dayOffset >= -14 && dayOffset < -4) {
      // Night shifts for 3 consecutive days (dayOffset -12, -11, -10)
      if (dayOffset === -12 || dayOffset === -11 || dayOffset === -10) {
        const nightStart = new Date(dayStart.getTime() + 22 * MS_PER_HOUR); // 10 PM
        const nightEnd = new Date(nightStart.getTime() + 8 * MS_PER_HOUR); // 6 AM next day
        shifts.push({
          id: `shift-sunita-${Math.abs(dayOffset)}`,
          workerId: "w2001",
          siteId: "site2",
          inAt: nightStart,
          outAt: nightEnd,
          method: "qr",
        });
      }
      // Short rest gap: after night shift ending 6 AM, starts again at 4 PM (only 10h rest < 11h)
      else if (dayOffset === -9) {
        const shortRestStart = new Date(dayStart.getTime() + 16 * MS_PER_HOUR); // 4 PM
        const shortRestEnd = new Date(shortRestStart.getTime() + 8 * MS_PER_HOUR); // 12 AM
        shifts.push({
          id: `shift-sunita-${Math.abs(dayOffset)}`,
          workerId: "w2001",
          siteId: "site2",
          inAt: shortRestStart,
          outAt: shortRestEnd,
          method: "qr",
        });
      } else {
        // Regular day shifts
        const dayShiftStart = new Date(dayStart.getTime() + 8 * MS_PER_HOUR);
        const dayShiftEnd = new Date(dayShiftStart.getTime() + 8 * MS_PER_HOUR);
        shifts.push({
          id: `shift-sunita-${Math.abs(dayOffset)}`,
          workerId: "w2001",
          siteId: "site2",
          inAt: dayShiftStart,
          outAt: dayShiftEnd,
          method: "qr",
        });
      }
    }

    // Ravi (w1006): several missed days — only works 3 out of 7 days
    if (dayOffset % 3 === 0 && dayOffset > -18) {
      // Mostly absent
    } else if (dayOffset > -15) {
      const shiftStart = new Date(dayStart.getTime() + 8 * MS_PER_HOUR);
      const shiftEnd = new Date(shiftStart.getTime() + (7.5 + rand()) * MS_PER_HOUR);
      shifts.push({
        id: `shift-ravi-${Math.abs(dayOffset)}`,
        workerId: "w1006",
        siteId: "site1",
        inAt: shiftStart,
        outAt: shiftEnd,
        method: "qr",
      });
    }

    // Other construction workers: regular shifts
    for (const wId of ["w1002", "w1003", "w1004", "w1005"]) {
      if (sunitaDayOfWeek === 0) continue; // Sundays off
      const shiftStart = new Date(dayStart.getTime() + (7 + rand()) * MS_PER_HOUR);
      const shiftEnd = new Date(shiftStart.getTime() + (7.5 + rand() * 1.5) * MS_PER_HOUR);
      shifts.push({
        id: `shift-${wId}-${Math.abs(dayOffset)}`,
        workerId: wId,
        siteId: "site1",
        inAt: shiftStart,
        outAt: shiftEnd,
        method: "qr",
      });
    }

    // Other hospital workers: regular shifts
    for (const wId of ["w2002", "w2003"]) {
      if (sunitaDayOfWeek === 0) continue;
      const shiftStart = new Date(dayStart.getTime() + 8 * MS_PER_HOUR);
      const shiftEnd = new Date(shiftStart.getTime() + 8 * MS_PER_HOUR);
      shifts.push({
        id: `shift-${wId}-${Math.abs(dayOffset)}`,
        workerId: wId,
        siteId: "site2",
        inAt: shiftStart,
        outAt: shiftEnd,
        method: "qr",
      });
    }
    for (const wId of ["w2004", "w2005", "w2006"]) {
      if (sunitaDayOfWeek === 0) continue;
      const shiftStart = new Date(dayStart.getTime() + 8 * MS_PER_HOUR);
      const shiftEnd = new Date(shiftStart.getTime() + 8 * MS_PER_HOUR);
      shifts.push({
        id: `shift-${wId}-${Math.abs(dayOffset)}`,
        workerId: wId,
        siteId: "site3",
        inAt: shiftStart,
        outAt: shiftEnd,
        method: "qr",
      });
    }
  }

  // ── Hazards ──
  const hazards: Hazard[] = [
    {
      id: "haz1", siteId: "site1", orgId: "org1", reporterId: "w1001",
      category: "scaffolding", severity: "high",
      transcript: "Floor 3 scaffolding is shaking", transcriptEn: "Floor 3 scaffolding is shaking",
      status: "received", timeline: [{ status: "received", at: new Date(now.getTime() - 2 * MS_PER_DAY) }],
      createdAt: new Date(now.getTime() - 2 * MS_PER_DAY),
    },
    {
      id: "haz2", siteId: "site1", orgId: "org1", reporterId: null,
      category: "electrical", severity: "critical",
      transcript: "Exposed wires near water tank", transcriptEn: "Exposed wires near water tank",
      status: "in_progress", assigneeUid: "admin1",
      timeline: [
        { status: "received", at: new Date(now.getTime() - 5 * MS_PER_DAY) },
        { status: "in_progress", at: new Date(now.getTime() - 4 * MS_PER_DAY), by: "admin1" },
      ],
      createdAt: new Date(now.getTime() - 5 * MS_PER_DAY),
    },
    {
      id: "haz3", siteId: "site1", orgId: "org1", reporterId: "w1004",
      category: "ppe_missing", severity: "medium",
      transcript: "No helmets available at floor 5", transcriptEn: "No helmets available at floor 5",
      status: "fixed",
      timeline: [
        { status: "received", at: new Date(now.getTime() - 10 * MS_PER_DAY) },
        { status: "in_progress", at: new Date(now.getTime() - 9 * MS_PER_DAY), by: "admin1" },
        { status: "fixed", at: new Date(now.getTime() - 7 * MS_PER_DAY), by: "admin1" },
      ],
      createdAt: new Date(now.getTime() - 10 * MS_PER_DAY),
    },
    {
      id: "haz4", siteId: "site2", orgId: "org2", reporterId: "w2001",
      category: "needle_stick", severity: "high",
      transcript: "Used needles found in regular waste bin", transcriptEn: "Used needles found in regular waste bin",
      status: "received",
      timeline: [{ status: "received", at: new Date(now.getTime() - 1 * MS_PER_DAY) }],
      createdAt: new Date(now.getTime() - 1 * MS_PER_DAY),
    },
    {
      id: "haz5", siteId: "site2", orgId: "org2", reporterId: null,
      category: "slip", severity: "low",
      transcript: "Wet floor near bathroom, no sign", transcriptEn: "Wet floor near bathroom, no sign",
      status: "fixed",
      timeline: [
        { status: "received", at: new Date(now.getTime() - 14 * MS_PER_DAY) },
        { status: "fixed", at: new Date(now.getTime() - 13 * MS_PER_DAY), by: "admin2" },
      ],
      createdAt: new Date(now.getTime() - 14 * MS_PER_DAY),
    },
    {
      id: "haz6", siteId: "site3", orgId: "org2", reporterId: "w2005",
      category: "chemical_biohazard", severity: "high",
      transcript: "Chemical spill in ward B corridor", transcriptEn: "Chemical spill in ward B corridor",
      status: "in_progress", assigneeUid: "admin2",
      timeline: [
        { status: "received", at: new Date(now.getTime() - 3 * MS_PER_DAY) },
        { status: "in_progress", at: new Date(now.getTime() - 2 * MS_PER_DAY), by: "admin2" },
      ],
      createdAt: new Date(now.getTime() - 3 * MS_PER_DAY),
    },
  ];

  // ── Feedback (12+ per org, >=5 per cohort, NO workerId) ──
  const feedbackScores = [
    [3, 2, 3], [2, 3, 2], [3, 3, 3], [1, 2, 2], [2, 2, 3],
    [3, 1, 2], [2, 3, 3], [1, 1, 1], [3, 2, 2], [2, 3, 2],
    [3, 3, 2], [1, 2, 3], [2, 2, 2], [3, 3, 1],
  ];

  const weekBucket = getWeekBucketStr(now);
  const prevWeekBucket = getWeekBucketStr(new Date(now.getTime() - 7 * MS_PER_DAY));

  const feedback: FeedbackEntry[] = [];
  let fbId = 1;

  // Org1 feedback — 14 entries, split across 2 weeks
  for (let i = 0; i < 14; i++) {
    const scores = feedbackScores[i % feedbackScores.length];
    feedback.push({
      id: `fb${fbId++}`,
      orgId: "org1",
      siteId: "site1",
      cohort: "org1:site1",
      weekBucket: i < 7 ? weekBucket : prevWeekBucket,
      scores: { pay: scores[0], safety: scores[1], respect: scores[2] },
      comment: i % 3 === 0 ? "Working conditions need improvement" : undefined,
      themes: i % 3 === 0 ? ["conditions", "safety"] : undefined,
      sentiment: scores[0],
      createdAt: new Date(now.getTime() - (i < 7 ? i : i + 7) * MS_PER_DAY),
    });
  }

  // Org2 feedback — 14 entries
  for (let i = 0; i < 14; i++) {
    const scores = feedbackScores[(i + 3) % feedbackScores.length];
    const site = i < 7 ? "site2" : "site3";
    feedback.push({
      id: `fb${fbId++}`,
      orgId: "org2",
      siteId: site,
      cohort: `org2:${site}`,
      weekBucket: i < 7 ? weekBucket : prevWeekBucket,
      scores: { pay: scores[0], safety: scores[1], respect: scores[2] },
      comment: i % 4 === 0 ? "Manager is good but we need more supplies" : undefined,
      themes: i % 4 === 0 ? ["management", "supplies"] : undefined,
      sentiment: scores[0],
      createdAt: new Date(now.getTime() - (i < 7 ? i : i + 7) * MS_PER_DAY),
    });
  }

  // ── Skills ──
  const skills: Skill[] = [
    { id: "sk1", workerId: "w1001", title: "Scaffolding Safety", issuer: "NSDC", date: new Date("2025-03-15"), verifiedBy: "admin1" },
    { id: "sk2", workerId: "w1001", title: "First Aid Basic", issuer: "Red Cross", date: new Date("2025-06-20") },
    { id: "sk3", workerId: "w1002", title: "Electrical Safety", issuer: "NSDC", date: new Date("2025-01-10"), verifiedBy: "admin1" },
    { id: "sk4", workerId: "w1003", title: "Height Work Certificate", issuer: "State Labour Dept", date: new Date("2024-11-01"), verifiedBy: "admin1" },
    { id: "sk5", workerId: "w2001", title: "Patient Care", issuer: "City Care Hospital", date: new Date("2025-02-15"), verifiedBy: "admin2" },
    { id: "sk6", workerId: "w2001", title: "Infection Control", issuer: "ICMR", date: new Date("2025-08-01") },
    { id: "sk7", workerId: "w2002", title: "Basic Life Support", issuer: "AHA", date: new Date("2025-05-10"), verifiedBy: "admin2" },
    { id: "sk8", workerId: "w2004", title: "Phlebotomy", issuer: "City Care Hospital", date: new Date("2025-04-20"), verifiedBy: "admin2" },
  ];

  return { orgs, sites, workers, admins, shifts, hazards, feedback, skills };
}

/** Simple week bucket helper for seed data (avoids importing core) */
function getWeekBucketStr(date: Date): string {
  // Get IST date
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  const year = ist.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((ist.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((dayOfYear + jan1.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}
