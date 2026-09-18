import { roundRupiah, type Result } from "./money";

export type PtkpStatus = "TK/0" | "TK/1" | "TK/2" | "TK/3" | "K/0" | "K/1" | "K/2" | "K/3";

/** PTKP per year in rupiah (UU HPP). Parameterised so the year is not baked in. */
export const PTKP_2022: Readonly<Record<PtkpStatus, number>> = {
  "TK/0": 54_000_000,
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0": 58_500_000,
  "K/1": 63_000_000,
  "K/2": 67_500_000,
  "K/3": 72_000_000,
};

export interface Bracket {
  /** Upper bound of the bracket, inclusive. `Infinity` for the top bracket. */
  upTo: number;
  ratePercent: number;
}

/** Progressive brackets per UU HPP, article 17. */
export const BRACKETS_2022: readonly Bracket[] = [
  { upTo: 60_000_000, ratePercent: 5 },
  { upTo: 250_000_000, ratePercent: 15 },
  { upTo: 500_000_000, ratePercent: 25 },
  { upTo: 5_000_000_000, ratePercent: 30 },
  { upTo: Number.POSITIVE_INFINITY, ratePercent: 35 },
];

export type Pph21Error = "NEGATIVE_INCOME" | "NOT_FINITE" | "UNKNOWN_STATUS";

export interface Pph21Result {
  taxableIncome: number;
  tax: number;
}

export interface Pph21Options {
  ptkp?: Readonly<Record<string, number>>;
  brackets?: readonly Bracket[];
}

/** Tax on an already-taxable amount, walking the brackets. */
export function progressiveTax(taxable: number, brackets: readonly Bracket[] = BRACKETS_2022): number {
  let remaining = taxable;
  let lower = 0;
  let tax = 0;
  // No early-exit guard: Math.min(remaining, width) is 0 once remaining is 0,
  // and mutation testing showed a guard here can never be observed.
  for (const b of brackets) {
    const width = b.upTo - lower;
    const slice = Math.min(remaining, width);
    tax += (slice * b.ratePercent) / 100;
    remaining -= slice;
    lower = b.upTo;
  }
  return roundRupiah(tax);
}

export function computePph21Annual(grossIncome: number, status: string, opts: Pph21Options = {}): Result<Pph21Result, Pph21Error> {
  if (!Number.isFinite(grossIncome)) return { ok: false, error: "NOT_FINITE" };
  if (grossIncome < 0) return { ok: false, error: "NEGATIVE_INCOME" };
  const ptkpTable: Readonly<Record<string, number>> = opts.ptkp ?? PTKP_2022;
  const ptkp = ptkpTable[status];
  if (ptkp === undefined) return { ok: false, error: "UNKNOWN_STATUS" };
  const taxableIncome = Math.max(0, roundRupiah(grossIncome) - ptkp);
  return { ok: true, value: { taxableIncome, tax: progressiveTax(taxableIncome, opts.brackets ?? BRACKETS_2022) } };
}
