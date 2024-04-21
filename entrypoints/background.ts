import { PublicPath } from "wxt/browser";
import {
  GlobalMode,
  SitMode,
  SiteModeStorage,
  onMessage,
} from "./common/messaging";
import { logger } from "./common/logger";
import { IsSupported } from "./common/utils";
import { safeStorage } from "./common/storage";
import { DEFAULT_HIGHLIGHT_STYLE } from "./common/style";

async function loadJsonFile(path: PublicPath) {
  const file_path = browser.runtime.getURL(path);

  const resp = await fetch(file_path);
  return await resp.json();
}

async function loadRankFile() {
  return loadJsonFile("/data/BNC15000En.json");
}

async function loadLemmaFile() {
  return loadJsonFile("/data/lemma.en.json");
}

async function loadTranslationFile(): Promise<Array<[string, string]>> {
  return loadJsonFile("/data/translation.json");
}

class BGHelper {
  static translationMap = new Map<string, string>();
  static loadTranslationFilePromise = Promise.resolve();
  static siteModeRecord: SiteModeStorage = {};
  static mode: GlobalMode = "enable";

  static loadTranslationData() {
    return (BGHelper.loadTranslationFilePromise = loadTranslationFile().then(
      (data) => {
        BGHelper.translationMap = new Map<string, string>(data);
      }
    ));
  }

  static waitTranslationData(ms: number) {
    return Promise.race([
      BGHelper.loadTranslationFilePromise,
      new Promise<void>((r) => setTimeout(() => r(), ms)),
    ]);
  }
  static translateWord(word: string) {
    return BGHelper.translationMap.get(word);
  }

  static getSiteMode(hostName: string) {
    return BGHelper.siteModeRecord[hostName] ?? "follow";
  }
  static setSiteMode(hostName: string, mode: SitMode) {
    if (mode !== BGHelper.siteModeRecord[hostName]) {
      BGHelper.siteModeRecord[hostName] = mode;
      BGHelper.syncSiteModeToStorage();
    }
  }
  static loadSiteMode() {
    return safeStorage.getItem("local:site-mode").then((data) => {
      if (!data) safeStorage.setItem("local:site-mode", {});
      BGHelper.siteModeRecord = data ?? {};
    });
  }

  static async loadMode() {
    const mode = await safeStorage.getItem("local:mode");
    if (!mode) safeStorage.setItem("local:mode", "enable");

    safeStorage.watch("local:mode", (newValue) => {
      BGHelper.mode = newValue ?? "enable";
    });
    BGHelper.mode = mode ?? "enable";
  }
  static syncSiteModeToStorage() {
    return safeStorage.setItem("local:site-mode", BGHelper.siteModeRecord);
  }

  static async load() {
    const precent = await safeStorage.getItem("local:percent");
    if (!precent) safeStorage.setItem("local:percent", 30);
    const ignore = await safeStorage.getItem("local:ignore-word");
    if (!ignore) safeStorage.setItem("local:ignore-word", []);

    const preference = await safeStorage.getItem("local:preference");
    if (!preference)
      safeStorage.setItem("local:preference", {
        highlight: DEFAULT_HIGHLIGHT_STYLE,
      });

    await BGHelper.loadSiteMode();
    await BGHelper.loadMode();
    await BGHelper.loadTranslationData();
  }
}

export default defineBackground(async () => {
  logger.log("Hello background!", { id: browser.runtime.id });
  browser.runtime.onInstalled.addListener(() => {
    loadRankFile().then((data) => {
      safeStorage.setItem("local:rank", data);
    });
    loadLemmaFile().then((data) => {
      safeStorage.setItem("local:lemma", data);
    });
  });

  await BGHelper.load();

  onMessage("translation", async (message) => {
    await BGHelper.waitTranslationData(500);
    return Object.fromEntries(
      message.data.words.map((w) => [w, BGHelper.translateWord(w) ?? ""])
    );
  });

  onMessage("getSiteMode", (message) => {
    logger.log("getSiteMode", message.data);
    return BGHelper.getSiteMode(message.data);
  });

  onMessage("setSiteMode", (message) => {
    const { hostName, mode } = message.data;
    logger.log("setSiteMode", hostName, mode);
    return BGHelper.setSiteMode(hostName, mode);
  });

  onMessage("isSupported", (message) => {
    const hostName = message.data;
    logger.log("isSupported", hostName);
    const siteMode = BGHelper.getSiteMode(hostName);
    const mode = BGHelper.mode;
    return IsSupported(mode, siteMode);
  });
  onMessage("replaceCSS", async (message) => {
    const { old, css } = message.data;
    logger.log("injectCSS", css);
    const tabId = message.sender?.tab?.id;

    if (tabId) {
      await browser.scripting.removeCSS({
        css: old,
        target: {
          allFrames: true,
          tabId,
        },
      });
      browser.scripting.insertCSS({
        css,
        target: {
          allFrames: true,
          tabId,
        },
      });
    }
  });
  onMessage("injectCSS", (message) => {
    const { css } = message.data;
    logger.log("injectCSS", css);
    const tabId = message.sender?.tab?.id;

    if (tabId)
      browser.scripting.insertCSS({
        css,
        target: {
          allFrames: true,
          tabId,
        },
      });
  });
  onMessage("removeCSS", (message) => {
    const { css } = message.data;
    logger.log("removeCSS", css);
    const tabId = message.sender?.tab?.id;

    if (tabId)
      browser.scripting.removeCSS({
        css,
        target: {
          allFrames: true,
          tabId,
        },
      });
  });
});
