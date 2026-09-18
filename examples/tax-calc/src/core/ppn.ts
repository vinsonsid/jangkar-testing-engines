import { roundRupiah, type Result } from "./money";

export type PpnError = "NEGATIVE_AMOUNT" | "NOT_FINITE" | "INVALID_RATE";

export const DEFAULT_PPN_RATE = 11;

export function computePpn(amount: number, ratePercent: number = DEFAULT_PPN_RATE): Result<number, PpnError> {
  if (!Number.isFinite(amount)) return { ok: false, error: "NOT_FINITE" };
  if (amount < 0) return { ok: false, error: "NEGATIVE_AMOUNT" };
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) return { ok: false, error: "INVALID_RATE" };
  return { ok: true, value: roundRupiah((amount * ratePercent) / 100) };
}
