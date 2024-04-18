import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: {
    name: "单词洞察力",
    permissions: ["contextMenus", "storage", "tabs"],
    action: {
      default_title: "配置",
    },
  },
  runner: {
    startUrls: ["https://developer.mozilla.org/en-US/", "https://github.com/ZhUyU1997/meui"],
    chromiumArgs: ["--window-size=400x300"],
  },
});
