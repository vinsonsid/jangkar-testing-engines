import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvoiceStore } from "../../src/adapters/invoice-store";
import { computePpn } from "../../src/core/ppn";

let dir: string;

describe("use case: record an invoice with tax", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "system-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("AC6: computes tax in core, persists through the adapter, reads back identical values", async () => {
    const store = new InvoiceStore(dir);
    const amount = 250_000;
    const tax = computePpn(amount);
    expect(tax).toStrictEqual({ ok: true, value: 27_500 });
    if (!tax.ok) return;

    const saved = await store.save({ id: "inv-9", amount, tax: tax.value });
    expect(saved.ok).toBe(true);

    expect(await store.get("inv-9")).toStrictEqual({ ok: true, value: { id: "inv-9", amount: 250_000, tax: 27_500 } });
  });
});
