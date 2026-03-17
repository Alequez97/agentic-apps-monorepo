import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendPort = process.env.VITE_BACKEND_PORT || "3030";
const frontendPort = parseInt(process.env.VITE_FRONTEND_PORT || "3131", 10);

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/public",
    emptyOutDir: true,
  },
  server: {
    port: frontendPort,
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      "/api/socket.io": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
