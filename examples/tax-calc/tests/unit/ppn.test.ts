import { describe, expect, it } from "vitest";
import { computePpn } from "../../src/core/ppn";

describe("computePpn", () => {
  it("AC1: applies 11% and rounds half-up to the rupiah", () => {
    expect(computePpn(1000)).toStrictEqual({ ok: true, value: 110 });
    expect(computePpn(1005)).toStrictEqual({ ok: true, value: 111 });
    expect(computePpn(1004)).toStrictEqual({ ok: true, value: 110 });
  });

  it("AC1: exact half rounds up, just below half rounds down", () => {
    // 4.5 * 11% = 0.495 -> 0 ; 4.545454.. * 11% = 0.5 -> 1
    expect(computePpn(4.5)).toStrictEqual({ ok: true, value: 0 });
    expect(computePpn(50 / 11)).toStrictEqual({ ok: true, value: 1 });
  });

  it("zero amount yields zero tax", () => {
    expect(computePpn(0)).toStrictEqual({ ok: true, value: 0 });
  });

  it("AC2: rejects negative amounts", () => {
    expect(computePpn(-1)).toStrictEqual({ ok: false, error: "NEGATIVE_AMOUNT" });
  });

  it("AC2: rejects non-finite amounts", () => {
    expect(computePpn(Number.NaN)).toStrictEqual({ ok: false, error: "NOT_FINITE" });
    expect(computePpn(Number.POSITIVE_INFINITY)).toStrictEqual({ ok: false, error: "NOT_FINITE" });
  });

  it("rejects rates outside 0..100 or non-finite", () => {
    expect(computePpn(100, -1)).toStrictEqual({ ok: false, error: "INVALID_RATE" });
    expect(computePpn(100, 101)).toStrictEqual({ ok: false, error: "INVALID_RATE" });
    expect(computePpn(100, Number.NaN)).toStrictEqual({ ok: false, error: "INVALID_RATE" });
  });

  it("accepts boundary rates 0 and 100", () => {
    expect(computePpn(100, 0)).toStrictEqual({ ok: true, value: 0 });
    expect(computePpn(100, 100)).toStrictEqual({ ok: true, value: 100 });
  });

  it("honours a custom rate", () => {
    expect(computePpn(1000, 12)).toStrictEqual({ ok: true, value: 120 });
  });
});
