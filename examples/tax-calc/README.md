# tax-calc: the standard done right

Reference project showing what the testing standard looks like in practice.

- `specs/pph21-and-ppn.md`: acceptance criteria written first.
- `src/core/`: pure logic, constants injected, `Result` types for expected failures.
- `src/adapters/invoice-store.ts`: thin filesystem adapter that delegates its one rule to core.
- `tests/unit/`: one file per core module, boundary cases at every bracket edge.
- `tests/integration/`: the adapter against the real filesystem.
- `tests/system/`: one use case end to end.

From the engine root:

```bash
npm run example:test -- --coverage
npm run example:mutation
```
