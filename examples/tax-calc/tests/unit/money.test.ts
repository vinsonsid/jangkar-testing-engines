import { describe, expect, it } from "vitest";
import { roundRupiah } from "../../src/core/money";

describe("roundRupiah", () => {
  it("rounds half up", () => {
    expect(roundRupiah(0.5)).toBe(1);
    expect(roundRupiah(0.49999)).toBe(0);
    expect(roundRupiah(2.5)).toBe(3);
  });
  it("leaves integers unchanged", () => {
    expect(roundRupiah(7)).toBe(7);
    expect(roundRupiah(0)).toBe(0);
  });
});
