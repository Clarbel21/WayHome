import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Build stamp shown in the app so anyone can tell which deployment they are viewing.
// GITHUB_SHA is set automatically by the GitHub Pages workflow.
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process?.env ?? {};
const build = (env.GITHUB_SHA ?? "local").slice(0, 7);
const builtAt = new Date().toISOString();

export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
  define: {
    __WAYHOME_BUILD__: JSON.stringify(build),
    __WAYHOME_BUILT_AT__: JSON.stringify(builtAt),
  },
});
