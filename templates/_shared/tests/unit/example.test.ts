import { describe, expect, it } from "vitest";
import { computePpn } from "../../src/core/example";

describe("computePpn", () => {
  it("AC1: applies 11% and rounds half-up to the rupiah", () => {
    expect(computePpn(1000)).toStrictEqual({ ok: true, value: 110 });
    expect(computePpn(1005)).toStrictEqual({ ok: true, value: 111 }); // 110.55 -> 111
    expect(computePpn(1004)).toStrictEqual({ ok: true, value: 110 }); // 110.44 -> 110
  });

  it("AC2: zero amount yields zero tax", () => {
    expect(computePpn(0)).toStrictEqual({ ok: true, value: 0 });
  });

  it("AC3: rejects negative amounts", () => {
    expect(computePpn(-1)).toStrictEqual({ ok: false, error: "NEGATIVE_AMOUNT" });
  });

  it("AC4: rejects non-finite amounts", () => {
    expect(computePpn(Number.NaN)).toStrictEqual({ ok: false, error: "NOT_FINITE" });
    expect(computePpn(Number.POSITIVE_INFINITY)).toStrictEqual({ ok: false, error: "NOT_FINITE" });
  });

  it("AC5: honours a custom rate", () => {
    expect(computePpn(1000, 12)).toStrictEqual({ ok: true, value: 120 });
  });
});
