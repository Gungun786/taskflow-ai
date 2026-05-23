// vite.config.js — place this in your /client folder
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api calls to your Express backend during development
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});

// ─────────────────────────────────────────────────────────────────────
// .env file in your /client folder:
// VITE_API_URL=http://localhost:5000/api
//
// .env file in your backend root:
// ANTHROPIC_API_KEY=your_key_here
// MONGODB_URI=your_mongo_connection_string
// PORT=5000
// ─────────────────────────────────────────────────────────────────────
