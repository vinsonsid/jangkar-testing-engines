// The layering rule from docs/architecture-for-testability.md, enforced.
// Included by base.mjs; importable on its own for projects with a custom base.
//
//   src/core      no I/O, no framework, no SDK, no adapters/app imports,
//                 no ambient time/randomness (inject them).
//   src/adapters  may use the world, may import core, may not import app.
//
// Globs are anchored on `src/core` and `src/adapters` anywhere in the tree so
// monorepos and the engine's own examples/ are covered.

const IO_PACKAGES = [
  { group: ["@supabase/*", "@supabase/**"], message: "core must not talk to the database. Move this to src/adapters." },
  { group: ["next", "next/*", "next/**"], message: "core must not depend on the framework." },
  { group: ["react", "react/*", "react-dom", "react-dom/*"], message: "core must not depend on the UI library." },
  { group: ["@anthropic-ai/*", "openai", "@google/*"], message: "core must not call an LLM. Wrap the SDK in src/adapters." },
  { group: ["axios", "node-fetch", "undici", "got", "ky"], message: "core must not do HTTP. Fetch in src/adapters and pass values in." },
  { group: ["node:*", "fs", "fs/*", "path", "os", "child_process", "http", "https", "net", "dns", "crypto", "stream", "stream/*", "worker_threads"], message: "core must not use Node I/O or platform APIs. Inject what you need." },
  { group: ["pg", "mysql2", "better-sqlite3", "sqlite3", "ioredis", "redis", "mongodb", "mongoose", "prisma", "@prisma/*", "drizzle-orm", "drizzle-orm/*", "knex"], message: "core must not touch a database driver. Move this to src/adapters." },
  { group: ["**/adapters", "**/adapters/**", "*/adapters/**"], message: "core must not import adapters. Adapters depend on core, never the reverse." },
  { group: ["**/app", "**/app/**", "*/app/**", "**/components/**", "**/pages/**"], message: "core must not import the app layer." },
];

const APP_FROM_ADAPTERS = [
  { group: ["**/app", "**/app/**", "*/app/**", "**/components/**", "**/pages/**"], message: "adapters must not import the app layer." },
];

const AMBIENT_WORLD = [
  { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: "core must not read the clock. Inject `now: () => Date`." },
  { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "core must not read the clock. Inject `now: () => Date`." },
  { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: "core must not use ambient randomness. Inject a seeded generator." },
  { selector: "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']", message: "core must not mint ids. Inject `id: () => string`." },
];

export const CORE_FILES = ["**/src/core/**/*.{ts,tsx,js,mjs}"];
export const ADAPTER_FILES = ["**/src/adapters/**/*.{ts,tsx,js,mjs}"];

export default [
  {
    name: "jangkar/layering/core",
    files: CORE_FILES,
    rules: {
      "no-restricted-imports": ["error", { patterns: IO_PACKAGES }],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "core must not do HTTP. Fetch in src/adapters and pass values in." },
        { name: "process", message: "core must not read the environment. Pass config in as a parameter." },
        { name: "XMLHttpRequest", message: "core must not do HTTP." },
        { name: "localStorage", message: "core must not touch browser storage." },
        { name: "sessionStorage", message: "core must not touch browser storage." },
        { name: "window", message: "core must not depend on the browser." },
        { name: "document", message: "core must not depend on the DOM." },
      ],
      "no-restricted-syntax": ["error", ...AMBIENT_WORLD],
    },
  },
  {
    name: "jangkar/layering/adapters",
    files: ADAPTER_FILES,
    rules: {
      "no-restricted-imports": ["error", { patterns: APP_FROM_ADAPTERS }],
    },
  },
];
