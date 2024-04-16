import { PublicPath } from "wxt/browser";
import { onMessage } from "./common/messaging";
import { LemmaData } from "./common/define";
import { logger } from "./common/logger";

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
  static ignoreList = new Set<string>();

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
}

export default defineBackground(() => {
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

    storage.setItem<boolean>("local:enable", true);
    storage.getItem<number>("local:percent").then((value) => {
      if (!value) storage.setItem<number>("local:percent", 30);
    });
    storage.setItem<string[]>("local:ignore", []);
    storage.getItem<string[]>("local:ignore-word").then((value) => {
      if (!value) storage.setItem<string[]>("local:ignore-word", []);
    });
  });

  storage.getItem<string[]>("local:ignore").then((data) => {
    if (data) {
      data.forEach((i) => BGHelper.ignoreList.add(i));
    }
  });

  BGHelper.loadTranslationData();

  onMessage("translation", async (message) => {
    await BGHelper.waitTranslationData(500);
    return Object.fromEntries(
      message.data.words.map((w) => [w, BGHelper.translateWord(w) ?? ""])
    );
  });

  onMessage("ignoreListHas", (message) => {
    logger.log(
      "ignoreListHas",
      message.data,
      BGHelper.ignoreList.has(message.data)
    );

    return BGHelper.ignoreList.has(message.data);
  });

  onMessage("ignoreListAdd", (message) => {
    logger.log("ignoreListAdd", message.data);
    if (BGHelper.ignoreList.add(message.data))
      storage.setItem<string[]>(
        "local:ignore",
        Array.from(BGHelper.ignoreList.keys())
      );
  });

  onMessage("ignoreListRemove", (message) => {
    logger.log("ignoreListRemove", message.data);
    if (BGHelper.ignoreList.delete(message.data))
      storage.setItem<string[]>(
        "local:ignore",
        Array.from(BGHelper.ignoreList.keys())
      );
  });

  browser.contextMenus.onClicked.addListener(function (info, tab) {
    if (!tab?.id) return;

    if (info.menuItemId === "addWords") {
      browser.tabs
        .sendMessage(tab.id, { action: "getSelection" })
        .then(async (response) => {
          if (!tab?.id) return;

          let html = await getMeaning(response.word);
          let pos = response.pos;
          browser.tabs
            .sendMessage(tab.id, {
              action: "translation",
              data: html,
              pos: pos,
            })
            .then((response) => {
              logger.log("sended!");
            });
        });
    }
  });
});
