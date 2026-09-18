import { describe, expect, it } from "vitest";
import { computePph21Annual, progressiveTax } from "../../src/core/pph21";

describe("progressiveTax", () => {
  it("AC3: splits income across brackets", () => {
    expect(progressiveTax(70_000_000)).toBe(4_500_000);
  });

  it("boundary: exactly at the top of each bracket", () => {
    expect(progressiveTax(60_000_000)).toBe(3_000_000);
    expect(progressiveTax(250_000_000)).toBe(3_000_000 + 28_500_000);
    expect(progressiveTax(500_000_000)).toBe(31_500_000 + 62_500_000);
    expect(progressiveTax(5_000_000_000)).toBe(94_000_000 + 1_350_000_000);
  });

  it("boundary: one rupiah into the next bracket", () => {
    expect(progressiveTax(60_000_001)).toBe(3_000_000); // 0.15 rounds to 0
    expect(progressiveTax(60_000_010)).toBe(3_000_002); // 1.5 rounds up
  });

  it("top bracket at 35% is unbounded", () => {
    expect(progressiveTax(6_000_000_000)).toBe(1_444_000_000 + 350_000_000);
  });

  it("zero taxable income is zero tax", () => {
    expect(progressiveTax(0)).toBe(0);
  });

  it("uses injected brackets", () => {
    expect(progressiveTax(1000, [{ upTo: Number.POSITIVE_INFINITY, ratePercent: 10 }])).toBe(100);
  });
});

describe("computePph21Annual", () => {
  it("AC4: subtracts PTKP before applying brackets", () => {
    expect(computePph21Annual(100_000_000, "TK/0")).toStrictEqual({
      ok: true,
      value: { taxableIncome: 46_000_000, tax: 2_300_000 },
    });
  });

  it("AC5: income at PTKP is zero tax", () => {
    expect(computePph21Annual(54_000_000, "TK/0")).toStrictEqual({ ok: true, value: { taxableIncome: 0, tax: 0 } });
  });

  it("AC5: income below PTKP is zero tax, never negative", () => {
    expect(computePph21Annual(10_000_000, "K/3")).toStrictEqual({ ok: true, value: { taxableIncome: 0, tax: 0 } });
  });

  it("different statuses use different PTKP", () => {
    expect(computePph21Annual(100_000_000, "K/3")).toStrictEqual({
      ok: true,
      value: { taxableIncome: 28_000_000, tax: 1_400_000 },
    });
  });

  it("rounds fractional gross income before subtracting PTKP", () => {
    expect(computePph21Annual(54_000_000.5, "TK/0")).toStrictEqual({ ok: true, value: { taxableIncome: 1, tax: 0 } });
  });

  it("rejects unknown status", () => {
    expect(computePph21Annual(1, "X/9")).toStrictEqual({ ok: false, error: "UNKNOWN_STATUS" });
  });

  it("zero income is valid and yields zero tax", () => {
    expect(computePph21Annual(0, "TK/0")).toStrictEqual({ ok: true, value: { taxableIncome: 0, tax: 0 } });
  });

  it("rejects negative and non-finite income", () => {
    expect(computePph21Annual(-1, "TK/0")).toStrictEqual({ ok: false, error: "NEGATIVE_INCOME" });
    expect(computePph21Annual(Number.NaN, "TK/0")).toStrictEqual({ ok: false, error: "NOT_FINITE" });
  });

  it("uses injected PTKP table and brackets", () => {
    const result = computePph21Annual(1_000, "custom", {
      ptkp: { custom: 100 },
      brackets: [{ upTo: Number.POSITIVE_INFINITY, ratePercent: 50 }],
    });
    expect(result).toStrictEqual({ ok: true, value: { taxableIncome: 900, tax: 450 } });
  });
});
