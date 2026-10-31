import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PayoutStatus } from "@/core/payouts";
import { payFocusMonth } from "@/core/period";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { getCheckoutProvider, type CheckoutProvider, type CheckoutRequest } from "@/server/payouts/provider";
import { createSimulatedCheckout, simulatedCheckoutPath } from "@/server/payouts/simulated";
import { buildPayroll } from "@/server/services/payroll";
import {
  cancelCheckout,
  completeSimulatedCheckout,
  confirmCheckout,
  payoutOverview,
  savePayoutAccount,
  startCheckout,
  waitingCheckout,
} from "@/server/services/payouts";

const now = new Date();
const month = payFocusMonth(now);
const origin = "https://fairshift.test";
const admin = { orgId: "org1", adminId: "admin1", month, origin, now };
let hexSeq = 0;
const randomHex = () => (++hexSeq).toString(16).padStart(12, "0");

beforeEach(() => resetMemoryStore());
afterEach(() => vi.unstubAllEnvs());

const rowsByWorker = async () => new Map((await buildPayroll(getRepos(), "org1", month)).map((r) => [r.workerId, r]));

/** A provider that records what it was asked and answers whatever the test sets. */
function fakeProvider(answer: { status?: PayoutStatus; createError?: Error; statusError?: Error } = {}) {
  const created: CheckoutRequest[] = [];
  const cancelled: string[] = [];
  const provider: CheckoutProvider = {
    name: "cashfree",
    create: async (request) => {
      if (answer.createError) throw answer.createError;
      created.push(request);
      return { url: `https://payments-test.cashfree.com/links/${request.batchId}` };
    },
    status: async () => {
      if (answer.statusError) throw answer.statusError;
      return answer.status ?? "pending";
    },
    cancel: async (batchId) => {
      cancelled.push(batchId);
    },
  };
  return { provider, created, cancelled, answer };
}

async function open(provider: CheckoutProvider, workerIds: string[]) {
  const result = await startCheckout(getRepos(), provider, { ...admin, workerIds, randomHex: randomHex() });
  if (!result.ok) throw new Error(`expected a checkout, got ${result.error}`);
  return result;
}

describe("who can be paid", () => {
  it("lists the month's pay for workers with nothing recorded, and the open gap for the rest", async () => {
    const rows = await rowsByWorker();
    const { payable } = await payoutOverview(getRepos(), "org1", month);
    const of = new Map(payable.map((p) => [p.workerId, p]));
    expect(of.get("w1001")).toMatchObject({ kind: "gap", amount: rows.get("w1001")!.outstanding });
    expect(of.get("w1002")).toMatchObject({ kind: "salary", amount: rows.get("w1002")!.net });
    expect(of.has("w1004")).toBe(false); // paid exactly
    expect(of.has("w1008")).toBe(false); // gap already paid
    expect(of.get("w1017")?.account).toBeNull(); // no bank details yet
  });

  it("never sends a full account number to the page", async () => {
    const { provider } = fakeProvider();
    await open(provider, ["w1003"]);
    const overview = await payoutOverview(getRepos(), "org1", month);
    const json = JSON.stringify(overview);
    for (const account of await getRepos().payoutAccounts.getByOrg("org1")) expect(json).not.toContain(account.account);
    expect(overview.accounts.find((a) => a.workerId === "w1001")?.account?.masked).toMatch(/^••••\d{4}$/);
  });

  it("can reuse payroll the page already built", async () => {
    const payroll = buildPayroll(getRepos(), "org1", month);
    expect(await payoutOverview(getRepos(), "org1", month, payroll)).toEqual(
      await payoutOverview(getRepos(), "org1", month),
    );
  });
});

describe("opening one checkout for several workers", () => {
  it("asks for the server's total, split to each worker's stored bank account", async () => {
    const { provider, created } = fakeProvider();
    const rows = await rowsByWorker();
    const result = await open(provider, ["w1001", "w1003", "w1005"]);
    expect(result.url).toBe(`https://payments-test.cashfree.com/links/${result.batchId}`);

    const [request] = created;
    const expected = [rows.get("w1001")!.outstanding, rows.get("w1003")!.net, rows.get("w1005")!.net];
    expect(request.splits.map((s) => s.amount)).toEqual(expected);
    expect(request.amount).toBe(expected.reduce((a, b) => a + b, 0));
    expect(request.returnUrl).toBe(`${origin}/api/checkout/return?batch=${result.batchId}`);
    expect(request.payer).toEqual({ id: "admin1", name: "Priya Menon" });
    const account = (await getRepos().payoutAccounts.get("w1003"))!;
    expect(request.splits[1]).toMatchObject({ account: account.account, ifsc: account.ifsc, holder: account.holder });

    // Waiting for payment: nothing is recorded yet, and these workers can't be put in another checkout.
    expect((await rowsByWorker()).get("w1003")!.paid).toBeUndefined();
    const { payable, batches } = await payoutOverview(getRepos(), "org1", month);
    expect(payable.find((p) => p.workerId === "w1003")?.busy).toBe(true);
    expect(batches[0]).toMatchObject({ checkoutUrl: result.url, summary: { pending: 3 } });
  });

  it("refuses the whole checkout when any worker can't be paid, and opens nothing", async () => {
    const { provider, created } = fakeProvider();
    expect(
      await startCheckout(getRepos(), provider, {
        ...admin,
        workerIds: ["w1003", "w1004", "w1017", "w2001"],
        randomHex: randomHex(),
      }),
    ).toEqual({
      ok: false,
      error: "rejected",
      rejected: [
        { workerId: "w1004", reason: "nothing_owed" },
        { workerId: "w1017", reason: "no_account" },
        { workerId: "w2001", reason: "not_found" },
      ],
    });
    expect(created).toEqual([]);
    expect(await getRepos().payoutBatches.getByOrgMonth("org1", month)).toEqual([]);
  });

  it("never puts a worker in two checkouts at once", async () => {
    const { provider } = fakeProvider();
    await open(provider, ["w1003"]);
    expect(
      await startCheckout(getRepos(), provider, { ...admin, workerIds: ["w1003", "w1003"], randomHex: randomHex() }),
    ).toEqual({ ok: false, error: "rejected", rejected: [{ workerId: "w1003", reason: "in_progress" }] });
  });

  it("refuses an empty checkout or one for more than 25 workers", async () => {
    const { provider } = fakeProvider();
    expect(await startCheckout(getRepos(), provider, { ...admin, workerIds: [], randomHex: randomHex() })).toEqual({
      ok: false,
      error: "invalid",
    });
    const many = Array.from({ length: 26 }, (_, i) => `w${1001 + i}`);
    expect(await startCheckout(getRepos(), provider, { ...admin, workerIds: many, randomHex: randomHex() })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("frees the workers when the checkout can't be opened", async () => {
    const { provider } = fakeProvider({ createError: new Error("Easy Split is not enabled") });
    const result = await startCheckout(getRepos(), provider, {
      ...admin,
      workerIds: ["w1003"],
      randomHex: randomHex(),
    });
    expect(result).toEqual({ ok: false, error: "checkout_failed", detail: "Easy Split is not enabled" });
    const { payable, batches } = await payoutOverview(getRepos(), "org1", month);
    expect(payable.find((p) => p.workerId === "w1003")?.busy).toBe(false);
    expect(batches[0].items[0]).toMatchObject({
      status: "failed",
      failure: "checkout_failed",
      detail: "Easy Split is not enabled",
    });
  });
});

describe("after the checkout", () => {
  it("records every worker's payment once the checkout is paid, and never twice", async () => {
    const fake = fakeProvider();
    const before = await rowsByWorker();
    const { batchId } = await open(fake.provider, ["w1001", "w1003"]);

    fake.answer.status = "paid";
    const confirmed = await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now });
    expect(confirmed).toMatchObject({ ok: true, month, batch: { summary: { paid: 2, pending: 0 } } });
    expect(confirmed.ok && confirmed.batch.checkoutUrl).toBeUndefined(); // nothing left to pay

    const after = await rowsByWorker();
    // Ramesh's gap is paid as arrears; Venkat's month is recorded exactly as payroll computed it.
    expect(after.get("w1001")!.outstanding).toBe(0);
    expect(after.get("w1001")!.arrearsPaid).toBe(before.get("w1001")!.outstanding);
    expect(after.get("w1003")!.paid?.netPaid).toBe(before.get("w1003")!.net);
    expect(after.get("w1003")!.check).toMatchObject({ status: "checked", findings: [], totalShortfall: 0 });

    const status = vi.spyOn(fake.provider, "status");
    const record = await getRepos().paidRecords.get("w1001", month);
    await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now });
    expect(status).not.toHaveBeenCalled();
    expect(await getRepos().paidRecords.get("w1001", month)).toEqual(record);
  });

  it("closes the worker's open pay review when their gap is paid", async () => {
    const { requestPayReview } = await import("@/server/services/disputes");
    expect((await requestPayReview(getRepos(), { workerId: "w1001", orgId: "org1", month, now })).ok).toBe(true);
    const fake = fakeProvider({ status: "paid" });
    const { batchId } = await open(fake.provider, ["w1001"]);
    await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now });
    const disputes = await getRepos().payDisputes.getByWorker("w1001");
    expect(disputes.find((d) => d.month === month)?.status).toBe("resolved");
  });

  it("keeps waiting while the checkout is unpaid, and records nothing", async () => {
    const fake = fakeProvider({ status: "pending" });
    const { batchId } = await open(fake.provider, ["w1003"]);
    const result = await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now });
    expect(result.ok && result.batch.summary.pending).toBe(1);
    expect(await getRepos().paidRecords.get("w1003", month)).toBeUndefined();
  });

  it("marks every share not paid when the link expires, and frees the workers", async () => {
    const fake = fakeProvider({ status: "failed" });
    const { batchId } = await open(fake.provider, ["w1003", "w1005"]);
    const result = await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now });
    expect(result.ok && result.batch.items.map((i) => [i.status, i.failure])).toEqual([
      ["failed", "payment_failed"],
      ["failed", "payment_failed"],
    ]);
    expect((await payoutOverview(getRepos(), "org1", month)).payable.find((p) => p.workerId === "w1003")?.busy).toBe(
      false,
    );
  });

  it("reports Cashfree being unreachable, and keeps waiting", async () => {
    const fake = fakeProvider({ statusError: new Error("offline") });
    const { batchId } = await open(fake.provider, ["w1003"]);
    expect(await confirmCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(await cancelCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect((await getRepos().payoutBatches.getById(batchId))!.items[0].status).toBe("pending");
  });

  it("does not find an unknown checkout", async () => {
    const { provider } = fakeProvider();
    const input = { orgId: "org1", batchId: "fs202610_000000000000", now };
    expect(await confirmCheckout(getRepos(), provider, input)).toEqual({ ok: false, error: "not_found" });
    expect(await cancelCheckout(getRepos(), provider, input)).toEqual({ ok: false, error: "not_found" });
    expect(await waitingCheckout(getRepos(), "org1", input.batchId)).toBeNull();
  });

  it("shows the newest five checkouts of the month", async () => {
    const { provider } = fakeProvider();
    const ids = ["w1003", "w1005", "w1007", "w1009", "w1010", "w1011"];
    for (const [i, workerId] of ids.entries()) {
      await startCheckout(getRepos(), provider, {
        ...admin,
        now: new Date(now.getTime() + i * 1000),
        workerIds: [workerId],
        randomHex: randomHex(),
      });
    }
    const { batches } = await payoutOverview(getRepos(), "org1", month);
    expect(batches.map((b) => b.items[0].workerId)).toEqual(ids.slice(1).reverse());
  });
});

describe("cancelling a checkout", () => {
  it("cancels the link and frees the workers", async () => {
    const fake = fakeProvider({ status: "pending" });
    const { batchId } = await open(fake.provider, ["w1003"]);
    expect(await cancelCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now })).toEqual({ ok: true });
    expect(fake.cancelled).toEqual([batchId]);
    const batch = (await getRepos().payoutBatches.getById(batchId))!;
    expect(batch.items[0]).toMatchObject({ status: "failed", failure: "payment_cancelled" });
    // Cancelling again is harmless.
    expect(await cancelCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now })).toEqual({ ok: true });
    expect(fake.cancelled).toHaveLength(1);
  });

  it("records the payment instead when the checkout was paid just before cancelling", async () => {
    const fake = fakeProvider({ status: "pending" });
    const { batchId } = await open(fake.provider, ["w1003"]);
    fake.answer.status = "paid";
    expect(await cancelCheckout(getRepos(), fake.provider, { orgId: "org1", batchId, now })).toEqual({ ok: true });
    expect(fake.cancelled).toEqual([]);
    expect(await getRepos().paidRecords.get("w1003", month)).toBeDefined();
  });
});

describe("the simulated checkout", () => {
  it("opens its own page and records the outcome chosen there", async () => {
    const provider = createSimulatedCheckout(getRepos());
    const { batchId, url } = await open(provider, ["w1003", "w1005"]);
    expect(url).toBe(simulatedCheckoutPath(batchId));
    expect((await waitingCheckout(getRepos(), "org1", batchId))?.items).toHaveLength(2);
    expect(await provider.status(batchId)).toBe("pending");

    expect(
      await completeSimulatedCheckout(getRepos(), provider, { orgId: "org1", batchId, outcome: "paid", now }),
    ).toEqual({ ok: true, month });
    expect(await getRepos().paidRecords.get("w1003", month)).toBeDefined();
    expect(await waitingCheckout(getRepos(), "org1", batchId)).toBeNull();
    expect(await provider.status("fs202610_ffffffffffff")).toBe("pending");
  });

  it("records a failed payment, and can be cancelled", async () => {
    const provider = createSimulatedCheckout(getRepos());
    const failed = await open(provider, ["w1003"]);
    await completeSimulatedCheckout(getRepos(), provider, {
      orgId: "org1",
      batchId: failed.batchId,
      outcome: "failed",
      now,
    });
    expect((await getRepos().payoutBatches.getById(failed.batchId))!.items[0].status).toBe("failed");

    const abandoned = await open(provider, ["w1003"]);
    expect(await cancelCheckout(getRepos(), provider, { orgId: "org1", batchId: abandoned.batchId, now })).toEqual({
      ok: true,
    });
    expect((await getRepos().payoutBatches.getById(abandoned.batchId))!.items[0].failure).toBe("payment_cancelled");
  });

  it("can't complete a real Cashfree checkout or another organisation's", async () => {
    const fake = fakeProvider();
    const real = await open(fake.provider, ["w1003"]);
    const simulated = createSimulatedCheckout(getRepos());
    const input = { batchId: real.batchId, outcome: "paid" as const, now };
    expect(await completeSimulatedCheckout(getRepos(), simulated, { ...input, orgId: "org1" })).toEqual({
      ok: false,
      error: "not_found",
    });
    const own = await open(simulated, ["w1005"]);
    expect(
      await completeSimulatedCheckout(getRepos(), simulated, { ...input, batchId: own.batchId, orgId: "org2" }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await getRepos().paidRecords.get("w1005", month)).toBeUndefined();
  });
});

describe("choosing the checkout", () => {
  it("uses Cashfree when its payment gateway keys are set", () => {
    vi.stubEnv("CASHFREE_APP_ID", "app");
    vi.stubEnv("CASHFREE_SECRET_KEY", "secret");
    expect(getCheckoutProvider()?.name).toBe("cashfree");
  });

  it("simulates the checkout in demo mode without keys, and is off otherwise", () => {
    vi.stubEnv("CASHFREE_APP_ID", "");
    vi.stubEnv("DEMO_MODE", "true");
    expect(getCheckoutProvider()?.name).toBe("simulated");
    vi.stubEnv("DEMO_MODE", "false");
    expect(getCheckoutProvider()).toBeNull();
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
