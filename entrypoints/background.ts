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

let translationMap = new Map<string, string>();

let ignoreList = new Set<string>();
export default defineBackground(() => {
  logger("Hello background!", { id: browser.runtime.id });
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
    storage.setItem<number>("local:percent", 30);
    storage.setItem<string[]>("local:ignore", []);
  });

  storage.getItem<string[]>("local:ignore").then((data) => {
    if (data) {
      data.forEach((i) => ignoreList.add(i));
    }
  });

  loadTranslationFile().then((data) => {
    translationMap = new Map<string, string>(data);
  });

  onMessage("translation", (message) => {
    return Object.fromEntries(
      message.data.words.map((w) => [w, translationMap.get(w) ?? ""])
    );
  });

  onMessage("ignoreListHas", (message) => {
    logger("ignoreListHas", message.data, ignoreList.has(message.data));

    return ignoreList.has(message.data);
  });

  onMessage("ignoreListAdd", (message) => {
    logger("ignoreListAdd", message.data);
    if (ignoreList.add(message.data))
      storage.setItem<string[]>("local:ignore", Array.from(ignoreList.keys()));
  });

  onMessage("ignoreListRemove", (message) => {
    logger("ignoreListRemove", message.data);
    if (ignoreList.delete(message.data))
      storage.setItem<string[]>("local:ignore", Array.from(ignoreList.keys()));
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
              logger("sended!");
            });
        });
    }
  });
});
