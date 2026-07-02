import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.wasm"],
  build: {
    modulePreload: {
      resolveDependencies(_url, deps) {
        return deps.filter((dep) => !dep.includes("swisseph-"));
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("vite/preload-helper")) {
            return "vendor";
          }
          if (id.includes("@tldr/astro-knowledge") || id.includes("packages/astro-knowledge")) {
            if (id.includes("sky-web.json")) {
              return "astro-knowledge-sky";
            }
            if (id.includes("natal-web.json")) {
              return "astro-knowledge-natal";
            }
            if (id.includes("relationships-web.json")) {
              return "astro-knowledge-relationships";
            }
            if (id.includes("sky.json")) {
              return "astro-knowledge-sky";
            }
            if (id.includes("natal.json")) {
              return "astro-knowledge-natal";
            }
            if (id.includes("relationships.json") || id.includes("synastry.json") || id.includes("composite.json")) {
              return "astro-knowledge-relationships";
            }
            if (id.includes("web.json")) {
              return "astro-knowledge-web";
            }
            return "astro-knowledge";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react";
          }
          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (id.includes("node_modules/swisseph-wasm")) {
            return "swisseph";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: ["swisseph-wasm"]
  }
});
