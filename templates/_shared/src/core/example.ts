// Example core module. Pure: no I/O, no framework imports.
// Delete once you have real domain code.

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type PpnError = "NEGATIVE_AMOUNT" | "NOT_FINITE";

/** Indonesian VAT (PPN) at the given rate, rounded half-up to the nearest rupiah. */
export function computePpn(amount: number, ratePercent = 11): Result<number, PpnError> {
  if (!Number.isFinite(amount)) return { ok: false, error: "NOT_FINITE" };
  if (amount < 0) return { ok: false, error: "NEGATIVE_AMOUNT" };
  const tax = Math.floor((amount * ratePercent) / 100 + 0.5);
  return { ok: true, value: tax };
}
