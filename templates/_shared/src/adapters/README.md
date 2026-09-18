Adapters: thin wrappers over the outside world (database, HTTP, SDKs). No business logic here. Each adapter gets an integration test in `tests/integration/` against a real local dependency.
