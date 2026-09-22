// Docs site for jtesting.pandancoco.com. Pages are the repo's own markdown:
// README.md becomes the home page, docs/*.md and CHANGELOG.md are the rest.
// Build: npm run docs:build  (output in .vitepress/dist, deployed by Vercel)
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "jangkar-testing-engines",
  description: "Strict configs, CI gates, and Claude Code tooling that hold vibe-coded software to a real quality bar.",
  lang: "en",
  srcDir: ".",
  srcExclude: [
    "node_modules/**", "examples/**", "templates/**", "claude/**", "configs/**", "ci/**", "tests/**", "bin/**", ".github/**", ".vitepress/**",
  ],
  rewrites: { "README.md": "index.md", "docs/:page": ":page" },
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: "Standard", link: "/testing-standard" },
      { text: "Roadmap", link: "/roadmap" },
      { text: "GitHub", link: "https://github.com/vinsonsid/jangkar-testing-engines" },
    ],
    sidebar: [
      {
        text: "Start here",
        items: [
          { text: "Overview", link: "/" },
          { text: "Testing standard", link: "/testing-standard" },
          { text: "Architecture for testability", link: "/architecture-for-testability" },
          { text: "Adopting the engine", link: "/adopting" },
        ],
      },
      {
        text: "Plan",
        items: [
          { text: "Roadmap", link: "/roadmap" },
          { text: "Changelog", link: "/CHANGELOG" },
        ],
      },
    ],
    outline: [2, 3],
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/vinsonsid/jangkar-testing-engines" }],
    footer: { message: "Jangkar. Tests live with the code; CI on the remote is the only authority." },
  },
});
