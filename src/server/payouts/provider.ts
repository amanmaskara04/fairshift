import "server-only";
import type { PayoutFailure, PayoutStatus } from "@/core/payouts";
import { isDemoMode } from "@/server/config";
import { createCashfreeProvider } from "./cashfree";
import { createSimulatedProvider } from "./simulated";

export interface TransferRequest {
  transferId: string;
  /** Paise */
  amount: number;
  holder: string;
  account: string;
  ifsc: string;
  remarks: string;
}

export interface TransferResult {
  transferId: string;
  status: PayoutStatus;
  failure?: PayoutFailure;
  detail?: string;
  utr?: string;
}

/** Sends a batch of bank transfers (IMPS to account + IFSC) and reports each transfer's status. */
export interface PayoutProvider {
  readonly name: "cashfree" | "simulated";
  send(batchId: string, transfers: TransferRequest[]): Promise<TransferResult[]>;
  status(batchId: string): Promise<TransferResult[]>;
}

/**
 * Cashfree's sandbox when its test keys are set; otherwise a simulation of the same sandbox
 * in demo mode; otherwise nothing (payouts are switched off).
 */
export function getPayoutProvider(): PayoutProvider | null {
  const { CASHFREE_CLIENT_ID: clientId, CASHFREE_CLIENT_SECRET: clientSecret } = process.env;
  if (clientId && clientSecret) {
    return createCashfreeProvider({ clientId, clientSecret, publicKey: process.env.CASHFREE_PUBLIC_KEY });
  }
  return isDemoMode() ? createSimulatedProvider() : null;
}
