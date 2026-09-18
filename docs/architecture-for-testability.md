# Architecture for Testability

The single most effective thing you can do for test quality is to keep business logic pure. This document is the practical guide to the layering rule in `testing-standard.md`.

## The rule in one line

`src/core` knows nothing about the world. `src/adapters` knows how to talk to the world. `src/app` wires them together.

## What goes in `core`

- Calculations: tax, pricing, scoring, dates, currency.
- Validation: is this input acceptable, and why not.
- State machines: an order moves from `draft` to `paid` to `shipped` under these rules.
- Domain types: `Invoice`, `TaxRate`, `Result<T, E>`.
- Policies: who may do what.

Every function in `core` takes plain values and returns plain values. It never `await`s I/O. It never imports `@supabase/*`, `next/*`, `@anthropic-ai/*`, `fs`, or `fetch`.

## What goes in `adapters`

- `adapters/db/invoices.ts`: `getInvoice(id)`, `saveInvoice(invoice)` using the Supabase client.
- `adapters/llm/anthropic.ts`: `classify(text)` calling the Anthropic SDK.
- `adapters/http/tax-authority.ts`: `fetchRates(date)`.

Adapters are thin. They translate between the world's shapes and `core`'s types. Logic in an adapter is a smell.

## What goes in `app`

Route handlers, server actions, React components, CLI commands. They call an adapter to load, call `core` to decide, call an adapter to save.

```ts
// app/api/invoices/[id]/pay/route.ts
export async function POST(req, { params }) {
  const invoice = await invoicesDb.get(params.id);       // adapter
  const result = payInvoice(invoice, await req.json());  // core, pure
  if (!result.ok) return Response.json(result.error, { status: 400 });
  await invoicesDb.save(result.value);                    // adapter
  return Response.json(result.value);
}
```

## Dependency injection without a framework

When `core` needs something from the world (current time, a random id), pass it in:

```ts
export function createInvoice(input: Input, deps: { now: () => Date; id: () => string }) { ... }
```

Tests pass fixed values. Production passes `{ now: () => new Date(), id: crypto.randomUUID }`.

## Results, not exceptions

`core` returns `Result` types for expected failures so tests can assert on them precisely and mutation testing can detect a swallowed branch:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Throw only for programmer errors.

## A retrofit recipe

For an existing project with logic scattered across routes and components:

1. Find the function with the most `if`s. That is business logic.
2. Copy it into `src/core/<domain>.ts`, replace every I/O call with a parameter.
3. Run `/spec-first` against it to get the tests.
4. Make the original call site use the new function.
5. Repeat.
