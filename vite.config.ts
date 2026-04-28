import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, "/");
          if (!moduleId.includes("/node_modules/")) return;

          if (
            moduleId.includes("/node_modules/react/") ||
            moduleId.includes("/node_modules/react-dom/") ||
            moduleId.includes("/node_modules/react-router-dom/")
          ) {
            return "vendor-react";
          }

          if (
            moduleId.includes("/node_modules/@stripe/stripe-js/") ||
            moduleId.includes("/node_modules/@stripe/react-stripe-js/")
          ) {
            return "vendor-stripe";
          }

          if (moduleId.includes("/node_modules/@supabase/supabase-js/")) {
            return "vendor-supabase";
          }

          if (
            moduleId.includes("/node_modules/lucide-react/") ||
            moduleId.includes("/node_modules/@radix-ui/") ||
            moduleId.includes("/node_modules/class-variance-authority/") ||
            moduleId.includes("/node_modules/clsx/") ||
            moduleId.includes("/node_modules/cmdk/") ||
            moduleId.includes("/node_modules/embla-carousel-react/") ||
            moduleId.includes("/node_modules/input-otp/") ||
            moduleId.includes("/node_modules/react-day-picker/") ||
            moduleId.includes("/node_modules/react-resizable-panels/") ||
            moduleId.includes("/node_modules/recharts/") ||
            moduleId.includes("/node_modules/sonner/") ||
            moduleId.includes("/node_modules/tailwind-merge/") ||
            moduleId.includes("/node_modules/vaul/")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
}));
