import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: {
    permissions: ["contextMenus", "storage", "tabs"],
    action: {
      default_title: "配置",
    },
  },
  runner: {
    startUrls: ["https://developer.mozilla.org/en-US/"],
    chromiumArgs: ["--window-size=400x300"],
  },
});
