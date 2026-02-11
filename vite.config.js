import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.js",
      name: "ocoTool1",
      fileName: () => "oco-tool-1.js",
      formats: ["iife"],
      cssFileName: () => "oco-tool-1.css",
    },
    cssCodeSplit: false,
    minify: true,
  },
});
