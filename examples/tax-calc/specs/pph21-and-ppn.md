# PPh 21 and PPN calculation

## Intent
A pure calculation module for two Indonesian taxes so downstream apps never re-implement rounding or bracket logic. This is the reference example of the testing standard done right.

## Layer placement
- core: `src/core/ppn.ts`, `src/core/pph21.ts`, `src/core/money.ts`
- adapters: `src/adapters/invoice-store.ts` (filesystem JSON store)
- app: none

## Acceptance criteria

### AC1: PPN at 11% rounds half-up to the rupiah
Given an amount of 1005
When PPN is computed at the default rate
Then the tax is 111

### AC2: PPN rejects negative or non-finite amounts
Given -1 or NaN
When PPN is computed
Then the result is an error, not a number

### AC3: PPh 21 annual tax uses progressive brackets (UU HPP)
Given taxable income of 70,000,000
When annual PPh 21 is computed
Then the tax is 5% of 60,000,000 + 15% of 10,000,000 = 4,500,000

### AC4: PPh 21 applies PTKP before brackets
Given gross annual income of 100,000,000 and status TK/0 (PTKP 54,000,000)
When annual PPh 21 is computed
Then taxable income is 46,000,000 and tax is 2,300,000

### AC5: PPh 21 is zero when income is at or below PTKP
Given income 54,000,000 and TK/0
Then tax is 0

### AC6: an invoice with tax can be stored and read back with identical values
Given an invoice with amount 250,000
When it is saved through the store
Then reading it back yields amount 250,000 and tax 27,500

## Edge cases and failure modes
- Amount exactly on a bracket boundary (60,000,000; 250,000,000; 500,000,000; 5,000,000,000)
- Fractional rupiah (x.5 rounds up, x.4999 rounds down)
- Unknown PTKP status is an error
- Store rejects an invoice whose stored tax does not match its recomputed tax

## Out of scope
- Monthly withholding, THR, tax credits, non-resident rates

## Assumptions
- Brackets and PTKP values per UU HPP 2022; constants are parameters so tests do not depend on the year.
