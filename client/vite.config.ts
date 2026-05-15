import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_POLL_API_TARGET || "http://localhost:4000";

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        "/api/auth": { target, changeOrigin: true },
        "/events": {
          target,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes("text/html")) {
              return "/index.html";
            }
          },
        },
        "/socket.io": { target, changeOrigin: true, ws: true },
        "/proxy": { target, changeOrigin: true },
      },
    },
  };
});
