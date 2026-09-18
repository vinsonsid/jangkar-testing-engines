// Adapter: JSON-on-disk invoice store. Thin. The only logic is delegating the
// tax check to core, which is what keeps the adapter honest.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Result } from "../core/money";
import { computePpn } from "../core/ppn";

export interface Invoice {
  id: string;
  amount: number;
  tax: number;
}

export type StoreError = "TAX_MISMATCH" | "NOT_FOUND" | "INVALID_AMOUNT";

export class InvoiceStore {
  constructor(private readonly dir: string) {}

  async save(invoice: Invoice): Promise<Result<Invoice, StoreError>> {
    const expected = computePpn(invoice.amount);
    if (!expected.ok) return { ok: false, error: "INVALID_AMOUNT" };
    if (expected.value !== invoice.tax) return { ok: false, error: "TAX_MISMATCH" };
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(invoice.id), JSON.stringify(invoice));
    return { ok: true, value: invoice };
  }

  async get(id: string): Promise<Result<Invoice, StoreError>> {
    try {
      const raw = await readFile(this.path(id), "utf8");
      return { ok: true, value: JSON.parse(raw) as Invoice };
    } catch {
      return { ok: false, error: "NOT_FOUND" };
    }
  }

  private path(id: string): string {
    return join(this.dir, `${id}.json`);
  }
}
