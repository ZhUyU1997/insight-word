import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: {
    permissions: ["menus", "contextMenus", "storage", "browser_action", "tabs"],
    action: {
      default_title: "配置",
    },
  },
  runner: {
    startUrls: ["https://google.com"],
    chromiumArgs: ["--window-size=400x300"],
  },
});
