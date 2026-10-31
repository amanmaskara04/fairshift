import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CASHFREE_SANDBOX_URL, cashfreeSignature, createCashfreeProvider } from "@/server/payouts/cashfree";

const NOW = new Date("2026-10-31T10:00:00Z");
const transfers = [
  {
    transferId: "fs202610_abc_1",
    amount: 90_750,
    holder: "Ramesh Kumar",
    account: "026291800001191",
    ifsc: "YESB0000262",
    remarks: "FairShift gap 2026-10",
  },
  {
    transferId: "fs202610_abc_2",
    amount: 18_400_00,
    holder: "Arun Yadav",
    account: "026291800001190",
    ifsc: "YESB0000262",
    remarks: "FairShift salary 2026-10",
  },
];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const statusBody = {
  batch_transfer_id: "fs202610_abc",
  status: "SUCCESS",
  transfers: [
    { transfer_id: "fs202610_abc_1", status: "SUCCESS", transfer_utr: "UTR123" },
    { transfer_id: "fs202610_abc_2", status: "FAILED", status_description: "Invalid account number" },
  ],
};

function provider(fetchImpl: typeof fetch, publicKey?: string) {
  return createCashfreeProvider({ clientId: "CF_ID", clientSecret: "CF_SECRET", publicKey, fetchImpl, now: () => NOW });
}

describe("Cashfree payouts (sandbox)", () => {
  it("sends one IMPS batch in rupees, then reads each transfer's outcome", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(200, { batch_transfer_id: "fs202610_abc", status: "RECEIVED" }))
      .mockResolvedValueOnce(json(200, statusBody));
    const results = await provider(fetchImpl).send("fs202610_abc", transfers);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${CASHFREE_SANDBOX_URL}/transfers/batch`);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers).toMatchObject({
      "x-api-version": "2024-01-01",
      "x-client-id": "CF_ID",
      "x-client-secret": "CF_SECRET",
    });
    expect(headers["x-cf-signature"]).toBeUndefined();
    expect(JSON.parse(String(init?.body))).toEqual({
      batch_transfer_id: "fs202610_abc",
      transfers: [
        {
          transfer_id: "fs202610_abc_1",
          transfer_amount: 907.5,
          transfer_currency: "INR",
          transfer_mode: "imps",
          transfer_remarks: "FairShift gap 2026-10",
          beneficiary_details: {
            beneficiary_name: "Ramesh Kumar",
            beneficiary_instrument_details: { bank_account_number: "026291800001191", bank_ifsc: "YESB0000262" },
          },
        },
        expect.objectContaining({ transfer_id: "fs202610_abc_2", transfer_amount: 18400 }),
      ],
    });
    expect(fetchImpl.mock.calls[1][0]).toBe(`${CASHFREE_SANDBOX_URL}/transfers/batch?batch_transfer_id=fs202610_abc`);
    expect(results).toEqual([
      { transferId: "fs202610_abc_1", status: "paid", utr: "UTR123" },
      {
        transferId: "fs202610_abc_2",
        status: "failed",
        failure: "invalid_account",
        detail: "Invalid account number",
      },
    ]);
  });

  it("signs requests with the account's public key when one is set", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    // Environment variables often carry the PEM with literal "\n".
    const signature = cashfreeSignature("CF_ID", pem.replace(/\n/g, "\\n"), NOW);
    const plain = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" },
      Buffer.from(signature, "base64"),
    ).toString();
    expect(plain).toBe(`CF_ID.${NOW.getTime() / 1000}`);
  });

  it("sends the signature header when configured", async () => {
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(200, statusBody));
    await provider(fetchImpl, pem).status("fs202610_abc");
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>)["x-cf-signature"]).toMatch(
      /^[A-Za-z0-9+/=]+$/,
    );
  });

  it("never resends after a timeout or a 5xx: the transfers stay processing to be checked", async () => {
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"));
    expect((await provider(offline).send("b", transfers)).map((r) => r.status)).toEqual(["pending", "pending"]);
    expect(offline).toHaveBeenCalledTimes(1);

    const down = vi.fn<typeof fetch>().mockResolvedValue(json(503, {}));
    expect((await provider(down).send("b", transfers)).map((r) => r.status)).toEqual(["pending", "pending"]);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("marks every transfer failed when the batch is refused", async () => {
    const refused = vi.fn<typeof fetch>().mockResolvedValue(json(400, { message: "Insufficient balance" }));
    expect(await provider(refused).send("b", transfers.slice(0, 1))).toEqual([
      { transferId: "fs202610_abc_1", status: "failed", failure: "bank_failed", detail: "Insufficient balance" },
    ]);
    const bare = vi.fn<typeof fetch>().mockResolvedValue(new Response("nope", { status: 401 }));
    expect((await provider(bare).send("b", transfers.slice(0, 1)))[0].detail).toBe("HTTP 401");
  });

  it("keeps transfers processing when the outcome can't be read yet", async () => {
    const accepted = () => json(200, { status: "RECEIVED" });
    const statusDown = vi.fn<typeof fetch>().mockResolvedValueOnce(accepted()).mockResolvedValueOnce(json(500, {}));
    expect((await provider(statusDown).send("b", transfers)).map((r) => r.status)).toEqual(["pending", "pending"]);

    const partial = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(json(200, { transfers: [{ transfer_id: "fs202610_abc_1", status: "PENDING" }] }));
    expect((await provider(partial).send("b", transfers)).map((r) => r.status)).toEqual(["pending", "pending"]);
  });

  it("refuses a status answer it doesn't understand", async () => {
    const odd = vi.fn<typeof fetch>().mockResolvedValue(json(200, { transfers: "nope" }));
    await expect(provider(odd).status("b")).rejects.toThrow("unexpected response");
    const down = vi.fn<typeof fetch>().mockResolvedValue(json(502, {}));
    await expect(provider(down).status("b")).rejects.toThrow("502");
    const empty = vi.fn<typeof fetch>().mockResolvedValue(json(200, {}));
    expect(await provider(empty).status("b")).toEqual([]);
  });
});
