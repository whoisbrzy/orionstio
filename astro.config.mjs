import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// Pages render on the server so the admin panel can sign people in and
// the public site can read prices and maintenance mode from storage.
export default defineConfig({
  output: "server",
  adapter: vercel(),
  compressHTML: true,
  security: { checkOrigin: true },
});
