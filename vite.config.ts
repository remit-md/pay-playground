import { defineConfig } from "vite";
import { resolve } from "path";
import { existsSync } from "fs";
import tailwindcss from "@tailwindcss/vite";

// Resolve SDK from local sibling (dev) or CI checkout (_sdk)
const sdkPaths = [
  resolve(__dirname, "../sdk/typescript/dist/index.js"),  // local dev
  resolve(__dirname, "_sdk/typescript/dist/index.js"),     // CI
];
const sdkPath = sdkPaths.find(existsSync);

export default defineConfig({
  base: "/playground/",
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "node:crypto": resolve(__dirname, "src/shims/crypto.ts"),
      "node:child_process": resolve(__dirname, "src/shims/child_process.ts"),
      "node:util": resolve(__dirname, "src/shims/util.ts"),
      "node:fs": resolve(__dirname, "src/shims/fs.ts"),
      "node:path": resolve(__dirname, "src/shims/path.ts"),
      "node:os": resolve(__dirname, "src/shims/os.ts"),
      buffer: resolve(__dirname, "src/shims/buffer.ts"),
      ...(sdkPath ? { "@pay-skill/sdk": sdkPath } : {}),
    },
    preserveSymlinks: false,
  },
  define: {
    "process.env": "{}",
    global: "globalThis",
  },
  server: {
    proxy: {
      "/proxy-api": {
        target: "http://204.168.133.111:3001",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/proxy-api/, "/api/v1"),
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
