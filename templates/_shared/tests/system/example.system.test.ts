// System test example: a use case through core + a real adapter (the
// filesystem), with state asserted by reading it back. Replace with your own.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computePpn } from "../../src/core/example";

let dir: string;

describe("use case: record an invoice with tax", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "system-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("AC1: persists the computed tax alongside the amount", async () => {
    const amount = 250_000;
    const tax = computePpn(amount);
    expect(tax.ok).toBe(true);
    if (!tax.ok) return;

    const file = join(dir, "invoice.json");
    await writeFile(file, JSON.stringify({ amount, tax: tax.value }));

    const stored = JSON.parse(await readFile(file, "utf8")) as { amount: number; tax: number };
    expect(stored).toStrictEqual({ amount: 250_000, tax: 27_500 });
  });
});
