import { PublicPath } from "wxt/browser";
import {
  GlobalMode,
  SitMode,
  SiteModeStorage,
  onMessage,
} from "./common/messaging";
import { LemmaData } from "./common/define";
import { logger } from "./common/logger";
import { IsSupported } from "./common/utils";

async function getMeaning(word: string) {
  // let response = await fetch("https://cn.bing.com/dict/search?q=" + word);
  // let data = await response.text();
  return `getMeaning of ${word}`;
}
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
    return storage.getItem<SiteModeStorage>("local:site-mode").then((data) => {
      if (!data) storage.setItem<SiteModeStorage>("local:site-mode", {});
      BGHelper.siteModeRecord = data ?? {};
    });
  }

  static async loadMode() {
    const mode = await storage.getItem<GlobalMode>("local:mode");
    if (!mode) storage.setItem<GlobalMode>("local:mode", "enable");

    storage.watch<GlobalMode>("local:mode", (newValue) => {
      BGHelper.mode = newValue ?? "enable";
    });
    BGHelper.mode = mode ?? "enable";
  }
  static syncSiteModeToStorage() {
    return storage.setItem<SiteModeStorage>(
      "local:site-mode",
      BGHelper.siteModeRecord
    );
  }

  static async load() {
    const precent = await storage.getItem<number>("local:percent");
    if (!precent) storage.setItem<number>("local:percent", 30);
    const ignore = storage.getItem<string[]>("local:ignore-word");
    if (!ignore) storage.setItem<string[]>("local:ignore-word", []);

    await BGHelper.loadSiteMode();
    await BGHelper.loadMode();
    await BGHelper.loadTranslationData();
  }
}

export default defineBackground(async () => {
  logger.log("Hello background!", { id: browser.runtime.id });
  browser.contextMenus.create({
    id: "addWords",
    title: 'Send "%s" to background',
    contexts: ["all"],
  });

  browser.runtime.onInstalled.addListener(() => {
    loadRankFile().then((data) => {
      storage.setItem<string[]>("local:rank", data);
    });
    loadLemmaFile().then((data) => {
      storage.setItem<LemmaData>("local:lemma", data);
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
});
