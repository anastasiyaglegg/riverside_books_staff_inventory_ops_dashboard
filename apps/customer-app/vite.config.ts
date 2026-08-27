import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only proxy so the chat widget's /chatbot/api/* calls reach Shalinthia's
  // deployed chatbot without a browser CORS hop. Prod uses the vercel.json rewrite.
  server: {
    proxy: {
      "/chatbot/api": {
        target: "https://riverside-books-customer-support-ch.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chatbot/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
  },
});
