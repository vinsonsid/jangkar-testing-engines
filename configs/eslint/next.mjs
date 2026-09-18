// Next.js projects: base + tests + Next's own rules.
// The project must have eslint-config-next installed (create-next-app does).
import base from "./base.mjs";
import tests from "./tests.mjs";

export default async function nextConfig() {
  const { default: nextVitals } = await import("eslint-config-next/core-web-vitals");
  return [...base, ...nextVitals, ...tests, { ignores: ["next-env.d.ts"] }];
}
