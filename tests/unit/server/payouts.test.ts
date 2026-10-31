import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { payFocusMonth } from "@/core/period";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { getPayoutProvider, type PayoutProvider, type TransferResult } from "@/server/payouts/provider";
import { createSimulatedProvider, resetSimulatedPayouts } from "@/server/payouts/simulated";
import { buildPayroll } from "@/server/services/payroll";
import { payoutOverview, payWorkers, refreshPayoutBatch, savePayoutAccount } from "@/server/services/payouts";

const now = new Date();
const month = payFocusMonth(now);
const admin = { orgId: "org1", adminId: "admin1", month, now };
let hexSeq = 0;
const randomHex = () => (++hexSeq).toString(16).padStart(12, "0");

beforeEach(() => {
  resetMemoryStore();
  resetSimulatedPayouts();
});
afterEach(() => vi.unstubAllEnvs());

const rowsByWorker = async () => new Map((await buildPayroll(getRepos(), "org1", month)).map((r) => [r.workerId, r]));

describe("who can be paid", () => {
  it("lists the month's pay for workers with nothing recorded, and the open gap for the rest", async () => {
    const rows = await rowsByWorker();
    const { payable } = await payoutOverview(getRepos(), "org1", month);
    const of = new Map(payable.map((p) => [p.workerId, p]));
    // Ramesh: overtime short-paid → only the gap.
    expect(of.get("w1001")).toMatchObject({ kind: "gap", amount: rows.get("w1001")!.outstanding });
    // Arun: nothing entered yet → the month's net pay.
    expect(of.get("w1002")).toMatchObject({ kind: "salary", amount: rows.get("w1002")!.net });
    // Dinesh was paid exactly; Babu's gap is already paid.
    expect(of.has("w1004")).toBe(false);
    expect(of.has("w1008")).toBe(false);
    // Valli has no bank details yet.
    expect(of.get("w1017")?.account).toBeNull();
  });

  it("never sends a full account number to the page", async () => {
    const overview = await payoutOverview(getRepos(), "org1", month);
    const json = JSON.stringify(overview);
    for (const account of await getRepos().payoutAccounts.getByOrg("org1")) {
      expect(json).not.toContain(account.account);
    }
    expect(overview.accounts.find((a) => a.workerId === "w1001")?.account?.masked).toMatch(/^••••\d{4}$/);
  });

  it("can reuse payroll the page already built", async () => {
    const payroll = buildPayroll(getRepos(), "org1", month);
    expect(await payoutOverview(getRepos(), "org1", month, payroll)).toEqual(
      await payoutOverview(getRepos(), "org1", month),
    );
  });
});

describe("paying several workers in one batch", () => {
  it("pays, fails and holds each transfer on its own, and records only what was paid", async () => {
    const provider = createSimulatedProvider();
    const before = await rowsByWorker();
    const result = await payWorkers(getRepos(), provider, {
      ...admin,
      workerIds: ["w1001", "w1003", "w1002", "w1006"],
      randomHex: randomHex(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const status = Object.fromEntries(result.batch.items.map((i) => [i.workerId, i.status]));
    expect(status).toEqual({ w1001: "paid", w1003: "paid", w1002: "failed", w1006: "pending" });
    expect(result.batch.items.find((i) => i.workerId === "w1002")?.failure).toBe("invalid_account");
    expect(result.batch.items.find((i) => i.workerId === "w1001")?.utr).toMatch(/^SIMUTR/);
    expect(result.batch.summary).toMatchObject({ paid: 2, failed: 1, pending: 1 });

    const after = await rowsByWorker();
    // Ramesh's gap is paid as arrears: nothing outstanding any more.
    expect(after.get("w1001")!.outstanding).toBe(0);
    expect(after.get("w1001")!.arrearsPaid).toBe(before.get("w1001")!.outstanding);
    // Venkat's month is recorded exactly as payroll computed it, so the check matches.
    expect(after.get("w1003")!.paid?.netPaid).toBe(before.get("w1003")!.net);
    expect(after.get("w1003")!.check).toMatchObject({ status: "checked", findings: [], totalShortfall: 0 });
    // A failed or processing transfer records nothing.
    expect(after.get("w1002")!.paid).toBeUndefined();
    expect(after.get("w1006")!.paid).toBeUndefined();
  });

  it("closes the worker's open pay review when their gap is paid", async () => {
    const { requestPayReview } = await import("@/server/services/disputes");
    const review = await requestPayReview(getRepos(), { workerId: "w1001", orgId: "org1", month, now });
    expect(review.ok).toBe(true);
    await payWorkers(getRepos(), createSimulatedProvider(), { ...admin, workerIds: ["w1001"], randomHex: randomHex() });
    const disputes = await getRepos().payDisputes.getByWorker("w1001");
    expect(disputes.find((d) => d.month === month)?.status).toBe("resolved");
  });

  it("refuses the whole batch when any worker can't be paid, and sends nothing", async () => {
    const provider = createSimulatedProvider();
    const send = vi.spyOn(provider, "send");
    const result = await payWorkers(getRepos(), provider, {
      ...admin,
      workerIds: ["w1003", "w1004", "w1017", "w2001"],
      randomHex: randomHex(),
    });
    expect(result).toEqual({
      ok: false,
      error: "rejected",
      rejected: [
        { workerId: "w1004", reason: "nothing_owed" },
        { workerId: "w1017", reason: "no_account" },
        { workerId: "w2001", reason: "not_found" },
      ],
    });
    expect(send).not.toHaveBeenCalled();
    expect(await getRepos().payoutBatches.getByOrgMonth("org1", month)).toEqual([]);
  });

  it("never pays a worker twice while a transfer is processing", async () => {
    const provider = createSimulatedProvider();
    await payWorkers(getRepos(), provider, { ...admin, workerIds: ["w1006"], randomHex: randomHex() });
    const overview = await payoutOverview(getRepos(), "org1", month);
    expect(overview.payable.find((p) => p.workerId === "w1006")?.busy).toBe(true);
    expect(
      await payWorkers(getRepos(), provider, { ...admin, workerIds: ["w1006", "w1006"], randomHex: randomHex() }),
    ).toEqual({ ok: false, error: "rejected", rejected: [{ workerId: "w1006", reason: "in_progress" }] });
  });

  it("refuses an empty batch or one larger than 25", async () => {
    const provider = createSimulatedProvider();
    expect(await payWorkers(getRepos(), provider, { ...admin, workerIds: [], randomHex: randomHex() })).toEqual({
      ok: false,
      error: "invalid",
    });
    const many = Array.from({ length: 26 }, (_, i) => `w${1001 + i}`);
    expect(await payWorkers(getRepos(), provider, { ...admin, workerIds: many, randomHex: randomHex() })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("sends the server's amounts and the stored bank details, never anything from the browser", async () => {
    const sent: Parameters<PayoutProvider["send"]>[1][] = [];
    const provider: PayoutProvider = {
      name: "cashfree",
      send: async (_id, transfers) => {
        sent.push(transfers);
        return transfers.map((t) => ({ transferId: t.transferId, status: "pending" }));
      },
      status: async () => [],
    };
    const rows = await rowsByWorker();
    const account = (await getRepos().payoutAccounts.get("w1003"))!;
    await payWorkers(getRepos(), provider, { ...admin, workerIds: ["w1003"], randomHex: randomHex() });
    expect(sent[0]).toEqual([
      expect.objectContaining({
        amount: rows.get("w1003")!.net,
        account: account.account,
        ifsc: account.ifsc,
        holder: account.holder,
        remarks: `FairShift salary ${month}`,
      }),
    ]);
  });
});

describe("checking processing transfers", () => {
  it("records a transfer when it is paid, and never records it twice", async () => {
    const provider = createSimulatedProvider();
    const result = await payWorkers(getRepos(), provider, {
      ...admin,
      workerIds: ["w1006"],
      randomHex: randomHex(),
    });
    if (!result.ok) throw new Error("expected a batch");
    const batchId = result.batch.id;

    const first = await refreshPayoutBatch(getRepos(), provider, { orgId: "org1", batchId, now });
    expect(first.ok && first.batch.items[0].status).toBe("paid");
    const record = await getRepos().paidRecords.get("w1006", month);
    expect(record?.netPaid).toBe(result.batch.items[0].amount);

    const status = vi.spyOn(provider, "status");
    const again = await refreshPayoutBatch(getRepos(), provider, { orgId: "org1", batchId, now });
    expect(again.ok).toBe(true);
    expect(status).not.toHaveBeenCalled(); // nothing left to ask about
    expect(await getRepos().paidRecords.get("w1006", month)).toEqual(record);
  });

  it("keeps a transfer processing until the provider gives a final answer", async () => {
    let answer: TransferResult["status"] = "pending";
    const provider: PayoutProvider = {
      name: "cashfree",
      send: async (_id, transfers) => transfers.map((t) => ({ transferId: t.transferId, status: "pending" })),
      status: async (batchId) => [{ transferId: `${batchId}_1`, status: answer, utr: "UTR1" }],
    };
    const result = await payWorkers(getRepos(), provider, { ...admin, workerIds: ["w1003"], randomHex: randomHex() });
    if (!result.ok) throw new Error("expected a batch");
    const check = () => refreshPayoutBatch(getRepos(), provider, { orgId: "org1", batchId: result.batch.id, now });

    expect((await check()).ok && (await getRepos().paidRecords.get("w1003", month))).toBeUndefined();
    answer = "paid";
    const done = await check();
    expect(done.ok && done.batch.items[0]).toMatchObject({ status: "paid", utr: "UTR1" });
    expect(await getRepos().paidRecords.get("w1003", month)).toBeDefined();
  });

  it("reports the provider being unreachable, and leaves the transfer processing", async () => {
    const provider: PayoutProvider = {
      name: "cashfree",
      send: async (_id, transfers) => transfers.map((t) => ({ transferId: t.transferId, status: "pending" })),
      status: async () => {
        throw new Error("offline");
      },
    };
    const result = await payWorkers(getRepos(), provider, { ...admin, workerIds: ["w1003"], randomHex: randomHex() });
    if (!result.ok) throw new Error("expected a batch");
    expect(await refreshPayoutBatch(getRepos(), provider, { orgId: "org1", batchId: result.batch.id, now })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect((await getRepos().payoutBatches.getById(result.batch.id))!.items[0].status).toBe("pending");
  });

  it("does not find an unknown batch", async () => {
    expect(
      await refreshPayoutBatch(getRepos(), createSimulatedProvider(), { orgId: "org1", batchId: "fs202610_x", now }),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("shows the newest five batches of the month", async () => {
    const provider = createSimulatedProvider();
    const ids = ["w1003", "w1005", "w1007", "w1009", "w1010", "w1011"];
    for (const [i, workerId] of ids.entries()) {
      const at = new Date(now.getTime() + i * 1000);
      await payWorkers(getRepos(), provider, { ...admin, now: at, workerIds: [workerId], randomHex: randomHex() });
    }
    const { batches } = await payoutOverview(getRepos(), "org1", month);
    expect(batches.map((b) => b.items[0].workerId)).toEqual(ids.slice(1).reverse());
  });
});

describe("the simulated sandbox", () => {
  it("follows Cashfree's documented outcomes for its test accounts", async () => {
    const provider = createSimulatedProvider();
    const transfer = (account: string, ifsc: string, n: number) => ({
      transferId: `b_${n}`,
      amount: 100_00,
      holder: "Test",
      account,
      ifsc,
      remarks: "x",
    });
    const sent = await provider.send("b", [
      transfer("1234567890", "ICIC0000001", 1),
      transfer("7766666351000", "YESB0000001", 2),
      transfer("999999999999", "SBIN0000001", 3),
    ]);
    expect(sent.map((s) => [s.status, s.failure])).toEqual([
      ["failed", "invalid_ifsc"],
      ["pending", undefined],
      ["failed", "not_in_sandbox"],
    ]);
    const later = await provider.status("b");
    expect(later[1]).toMatchObject({ status: "failed", failure: "bank_failed" });
    expect(await provider.status("unknown")).toEqual([]);
  });
});

describe("choosing the payout provider", () => {
  it("uses Cashfree when its keys are set", () => {
    vi.stubEnv("CASHFREE_CLIENT_ID", "id");
    vi.stubEnv("CASHFREE_CLIENT_SECRET", "secret");
    expect(getPayoutProvider()?.name).toBe("cashfree");
  });

  it("simulates the sandbox in demo mode without keys, and is off otherwise", () => {
    vi.stubEnv("CASHFREE_CLIENT_ID", "");
    vi.stubEnv("DEMO_MODE", "true");
    expect(getPayoutProvider()?.name).toBe("simulated");
    vi.stubEnv("DEMO_MODE", "false");
    expect(getPayoutProvider()).toBeNull();
  });
});

describe("bank details", () => {
  const input = { orgId: "org1", adminId: "admin1", workerId: "w1017", now };

  it("saves cleaned-up details and returns only the masked number", async () => {
    const result = await savePayoutAccount(getRepos(), {
      ...input,
      holder: "  Valli   Ammal ",
      account: "0262 9180 0001 191",
      ifsc: "yesb0000262",
    });
    expect(result).toEqual({ ok: true, account: { holder: "Valli Ammal", masked: "••••1191", ifsc: "YESB0000262" } });
    expect(await getRepos().payoutAccounts.get("w1017")).toMatchObject({
      account: "026291800001191",
      orgId: "org1",
      updatedBy: "admin1",
    });
    const { payable } = await payoutOverview(getRepos(), "org1", month);
    expect(payable.find((p) => p.workerId === "w1017")?.account?.masked).toBe("••••1191");
  });

  it("refuses a bad name, account number or IFSC", async () => {
    const good = { holder: "Valli Ammal", account: "026291800001191", ifsc: "YESB0000262" };
    expect(await savePayoutAccount(getRepos(), { ...input, ...good, holder: "V1" })).toEqual({
      ok: false,
      error: "holder",
    });
    expect(await savePayoutAccount(getRepos(), { ...input, ...good, account: "12345" })).toEqual({
      ok: false,
      error: "account",
    });
    expect(await savePayoutAccount(getRepos(), { ...input, ...good, ifsc: "YESB1234567" })).toEqual({
      ok: false,
      error: "ifsc",
    });
    expect(await savePayoutAccount(getRepos(), { ...input, ...good, workerId: "nobody" })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getRepos().payoutAccounts.get("w1017")).toBeUndefined();
  });

  it("replaces the details on file", async () => {
    await savePayoutAccount(getRepos(), {
      ...input,
      workerId: "w1001",
      holder: "Ramesh Kumar",
      account: "388108022658",
      ifsc: "ICIC0000009",
    });
    expect((await getRepos().payoutAccounts.get("w1001"))?.account).toBe("388108022658");
  });
});
