import "server-only";
import { constants, publicEncrypt } from "node:crypto";
import { z } from "zod";
import { classifyFailure, mapTransferStatus, paiseToRupees } from "@/core/payouts";
import type { PayoutProvider, TransferRequest, TransferResult } from "./provider";

/**
 * Cashfree Payouts (API v2), sandbox only. Going live needs the employer's business KYC and a
 * funded payout account, and is a deliberate change of this URL, not a setting.
 */
export const CASHFREE_SANDBOX_URL = "https://sandbox.cashfree.com/payout";
const API_VERSION = "2024-01-01";
/** Cashfree recommends a 10 s client timeout; a slow transfer is then checked, never resent. */
const TIMEOUT_MS = 10_000;

interface CashfreeConfig {
  clientId: string;
  clientSecret: string;
  /** PEM public key from the Payouts dashboard (2FA). Needed when the server has no fixed IP. */
  publicKey?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const BatchStatus = z.object({
  transfers: z
    .array(
      z.object({
        transfer_id: z.string(),
        status: z.string(),
        status_description: z.string().optional().nullable(),
        transfer_utr: z.string().optional().nullable(),
      }),
    )
    .default([]),
});

/** X-Cf-Signature: "clientId.unixSeconds" encrypted with the account's public key (RSA-OAEP). */
export function cashfreeSignature(clientId: string, publicKeyPem: string, now: Date): string {
  const key = publicKeyPem.replace(/\\n/g, "\n");
  const payload = Buffer.from(`${clientId}.${Math.floor(now.getTime() / 1000)}`);
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" }, payload).toString(
    "base64",
  );
}

export function createCashfreeProvider(config: CashfreeConfig): PayoutProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());

  function headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      ...(config.publicKey ? { "x-cf-signature": cashfreeSignature(config.clientId, config.publicKey, now()) } : {}),
    };
  }

  async function status(batchId: string): Promise<TransferResult[]> {
    const response = await fetchImpl(
      `${CASHFREE_SANDBOX_URL}/transfers/batch?batch_transfer_id=${encodeURIComponent(batchId)}`,
      { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" },
    );
    if (!response.ok) throw new Error(`cashfree status ${response.status}`);
    const parsed = BatchStatus.safeParse(await response.json());
    if (!parsed.success) throw new Error("cashfree status: unexpected response");
    return parsed.data.transfers.map((t) => {
      const mapped = mapTransferStatus(t.status);
      const detail = t.status_description?.slice(0, 120) || undefined;
      return {
        transferId: t.transfer_id,
        status: mapped,
        ...(mapped === "failed" ? { failure: classifyFailure(detail), detail } : {}),
        ...(t.transfer_utr ? { utr: t.transfer_utr } : {}),
      };
    });
  }

  async function send(batchId: string, transfers: TransferRequest[]): Promise<TransferResult[]> {
    const body = {
      batch_transfer_id: batchId,
      transfers: transfers.map((t) => ({
        transfer_id: t.transferId,
        transfer_amount: paiseToRupees(t.amount),
        transfer_currency: "INR",
        transfer_mode: "imps",
        transfer_remarks: t.remarks.slice(0, 70),
        beneficiary_details: {
          beneficiary_name: t.holder.slice(0, 100),
          beneficiary_instrument_details: { bank_account_number: t.account, bank_ifsc: t.ifsc },
        },
      })),
    };
    let response: Response;
    try {
      response = await fetchImpl(`${CASHFREE_SANDBOX_URL}/transfers/batch`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      // Timed out or the network dropped: the batch may have been accepted. Never resend; check it.
      return transfers.map((t) => ({ transferId: t.transferId, status: "pending" }));
    }
    if (response.status >= 500) {
      // Cashfree: on a 5xx, do not start another transfer; check the batch status instead.
      return transfers.map((t) => ({ transferId: t.transferId, status: "pending" }));
    }
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { message?: string };
      const detail = (error.message ?? `HTTP ${response.status}`).slice(0, 120);
      return transfers.map((t) => ({ transferId: t.transferId, status: "failed", failure: "bank_failed", detail }));
    }
    // Accepted. Ask once for the outcome; anything still processing is checked later.
    try {
      const results = await status(batchId);
      const byId = new Map(results.map((r) => [r.transferId, r]));
      return transfers.map((t) => byId.get(t.transferId) ?? { transferId: t.transferId, status: "pending" });
    } catch {
      return transfers.map((t) => ({ transferId: t.transferId, status: "pending" }));
    }
  }

  return { name: "cashfree", send, status };
}
