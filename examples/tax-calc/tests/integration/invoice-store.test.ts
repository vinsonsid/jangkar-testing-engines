import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvoiceStore } from "../../src/adapters/invoice-store";

let dir: string;
let store: InvoiceStore;

describe("InvoiceStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "invoice-store-"));
    store = new InvoiceStore(join(dir, "nested"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a JSON file named by id, creating the directory", async () => {
    const result = await store.save({ id: "inv-1", amount: 1000, tax: 110 });
    expect(result).toStrictEqual({ ok: true, value: { id: "inv-1", amount: 1000, tax: 110 } });
    const raw = await readFile(join(dir, "nested", "inv-1.json"), "utf8");
    expect(JSON.parse(raw)).toStrictEqual({ id: "inv-1", amount: 1000, tax: 110 });
  });

  it("rejects an invoice whose tax does not match the computed PPN", async () => {
    expect(await store.save({ id: "inv-2", amount: 1000, tax: 999 })).toStrictEqual({ ok: false, error: "TAX_MISMATCH" });
    expect(await store.get("inv-2")).toStrictEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("rejects an invoice with an invalid amount", async () => {
    expect(await store.save({ id: "inv-3", amount: -5, tax: 0 })).toStrictEqual({ ok: false, error: "INVALID_AMOUNT" });
  });

  it("returns NOT_FOUND for a missing id", async () => {
    expect(await store.get("nope")).toStrictEqual({ ok: false, error: "NOT_FOUND" });
  });
});
