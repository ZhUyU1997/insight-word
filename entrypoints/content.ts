import { browser } from "wxt/browser";
import "./index.less";
import {
  GlobalMode,
  SitMode,
  onMessage,
  sendMessage,
} from "./common/messaging";
import { Unwatch, WatchCallback } from "wxt/storage";
import { LemmaData } from "./common/define";
import { logger } from "./common/logger";
import tinycolor from "tinycolor2";
import { IsSupported } from "./common/utils";

class Setting {
  static mode: GlobalMode = "enable";
  static siteMode: SitMode = "follow";
  static enable = true;

  static filterPercent = 30;
  static setEnable(value: GlobalMode) {
    Setting.mode = value;
  }
  static setFilterPercent(value: number) {
    Setting.filterPercent = value;
  }
  static async isSupported() {
    return (Setting.enable = await sendMessage(
      "isSupported",
      location.hostname
    ));
  }

  static checkEnable() {
    logger.log("checkEnable", Setting.mode, Setting.siteMode);
    return (Setting.enable = IsSupported(Setting.mode, Setting.siteMode));
  }

  static trySetFilterPercent(value: number | null | undefined) {
    if (typeof value === "number") {
      Setting.filterPercent = value;
      return true;
    }
    return false;
  }
  static numberToPercent(value: number) {
    return Math.ceil(Math.max(Math.min(value * 100, 100), 0));
  }
  static inRange(percent: number) {
    return percent >= Setting.filterPercent;
  }
  static getSiteModeFromBG() {
    return sendMessage("getSiteMode", location.hostname);
  }

  static async load() {
    const mode = await storage.getItem<GlobalMode>("local:mode");
    Setting.mode = mode ?? "enable";
    const siteMode = await Setting.getSiteModeFromBG();
    Setting.siteMode = siteMode ?? "follow";
    await Setting.checkEnable();
  }
}

class WordHelper {
  rankMap = new Map<string, number>();
  lemmaMap = new Map<string, string>();
  ignoreSet = new Set<string>();

  getWordRank(word: string) {
    if (this.ignoreSet.has(word)) {
      logger.log("found ignored word:", word);
      return 0;
    }
    return this.rankMap.get(word) ?? 0;
  }

  wordExist(word: string) {
    return this.rankMap.has(word);
  }

  getWordPercent(word: string) {
    if (this.rankMap.size == 0) {
      return 0;
    }

    if (this.ignoreSet.has(word)) {
      logger.log("found ignored word:", word);
      return 0;
    }
    return Setting.numberToPercent(this.getWordRank(word) / this.rankMap.size);
  }

  getWordLemma(word: string) {
    if (this.rankMap.has(word)) return word;

    return this.lemmaMap.get(word) ?? "";
  }

  getWordLemmaFast(word: string) {
    return this.lemmaMap.get(word) ?? "";
  }
  async loadIgnore() {
    if (this.ignoreSet.size == 0) {
      logger.log("load ignore data");
      const ignore = await storage.getItem<string>("local:ignore-word");
      if (ignore) {
        this.ignoreSet = new Set<string>(ignore);
      } else logger.log("failed to load ignore");
    }
  }

  updataIgnore(data: string[]) {
    logger.log("updata ignore data");
    this.ignoreSet = new Set<string>(data);
  }

  async ignoreWord(word: string) {
    logger.log("ignore word", word);
    if (this.ignoreSet.add(word)) {
      await storage.setItem<string[]>(
        "local:ignore-word",
        Array.from(this.ignoreSet.keys())
      );
    }
  }

  async loadRankData() {
    if (this.rankMap.size == 0) {
      logger.log("load rank data");
      const rank = await storage.getItem<string[]>("local:rank");
      if (rank) {
        this.rankMap = new Map<string, number>(
          rank.map((item, index) => [item, index + 1])
        );
      } else logger.log("failed to load rank");
    }
  }
  async loadLemmaData() {
    if (this.lemmaMap.size == 0) {
      logger.log("load lemma data");
      const lemma = await storage.getItem<LemmaData>("local:lemma");
      if (lemma) {
        const array = lemma.reduce<Array<[string, string]>>(
          (prev, [word, others]) => {
            prev.push(...others.map<[string, string]>((i) => [i, word]));
            return prev;
          },
          []
        );
        this.lemmaMap = new Map<string, string>(array);
      } else logger.log("failed to load lemma");
    }
  }

  hasLoad = false;
  async loadData() {
    await Promise.all([
      this.loadIgnore(),
      this.loadRankData(),
      this.loadLemmaData(),
    ]);
  }

  static wordRe = new RegExp("^[a-z][a-z-]*$");

  match(word: string): [false] | [true, number, string] {
    const word_lower = word.toLowerCase();

    if (!WordHelper.wordRe.test(word_lower)) return [false];

    const lemma = this.wordExist(word)
      ? word
      : this.wordExist(word_lower)
      ? word_lower
      : this.getWordLemmaFast(word_lower);

    if (!lemma) return [false];

    const percent = this.getWordPercent(lemma);
    if (!Setting.inRange(percent)) {
      return [false];
    }

    return [true, percent, lemma];
  }
}

const Helper = new WordHelper();

const HIGHLIGHT_CLASS = "highlight";
const HIGHLIGHT_IGNORE_CLASS = "insight-word-ignore";

const translationCache = new Map<string, string>();
async function getTranslation(word: string) {
  const _w = word.toLowerCase();
  const lemma = Helper.getWordLemmaFast(_w);
  const value = translationCache.get(_w);

  if (value) return value;

  logger.log("get translation from bg");
  const translation = await sendMessage("translation", {
    words: [_w, lemma],
  });

  Object.entries(translation).forEach(([k, v]) => {
    translationCache.set(k, v);
  });

  const result1 = translation[_w];
  const result2 = translation[lemma];
  if (result1 && result1 !== "NULL") return result1;
  if (result2 && result2 !== "NULL") {
    logger.log("map translation", _w, "=>", result2);
    const text = `${lemma} | ${result2}`;
    translationCache.set(_w, text);
    return text;
  }
  return "";
}

function getTranslationFromCache(word: string) {
  const _w = word.toLowerCase();
  const value = translationCache.get(_w);
  return value;
}

function onClick(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.classList.contains(HIGHLIGHT_CLASS)) return;

  if (el && el.textContent) {
    if (!getTranslationFromCache(el.textContent)) {
      const url = new URL(
        "https://translate.google.com/?sl=en&tl=zh&text=&op=translate"
      );
      url.searchParams.set("text", el.textContent?.trim());
      open(url.href);
      e.stopPropagation();
      e.preventDefault();
    }
  }
}

let popupHideTimerId: any = null;

class TranslationPopup {
  static popup: HTMLElement | null = null;
  static deleteIcon: HTMLElement | null = null;
  static p: HTMLElement | null = null;
  static currentWord: HTMLElement | null = null;

  static get() {
    if (!TranslationPopup.popup) {
      const popup = document.createElement("div");
      popup.classList.add("insight-word-popup", HIGHLIGHT_IGNORE_CLASS);
      document.body.appendChild(popup);

      document.addEventListener("wheel", () => {
        TranslationPopup.hideDirectly();
      });
      popup.addEventListener("mouseleave", () => {
        TranslationPopup.hide();
      });
      popup.addEventListener("mouseenter", () => {
        clearTimeout(popupHideTimerId);
      });

      {
        const deleteIcon = document.createElement("div");
        deleteIcon.classList.add(HIGHLIGHT_IGNORE_CLASS, "delete");
        deleteIcon.textContent = "忽略";

        document.addEventListener("wheel", () => {
          TranslationPopup.hide();
        });
        deleteIcon.addEventListener("mouseleave", () => {
          TranslationPopup.hide();
        });
        deleteIcon.addEventListener("mouseenter", () => {
          clearTimeout(popupHideTimerId);
        });
        deleteIcon.addEventListener("click", () => {
          const lemma = TranslationPopup.currentWord?.dataset.lemma ?? "";

          if (lemma) {
            Helper.ignoreWord(lemma);
            updateHightlightStyleByIgnore();
          }
          TranslationPopup.hideDirectly();
        });
        TranslationPopup.deleteIcon = deleteIcon;
        popup.appendChild(deleteIcon);
      }

      {
        const p = document.createElement("p");
        p.classList.add(HIGHLIGHT_IGNORE_CLASS);
        popup.appendChild(p);
        TranslationPopup.p = p;
      }
      TranslationPopup.popup = popup;
    }

    return TranslationPopup.popup;
  }
  static setText(text: string) {
    const p = TranslationPopup.p;
    if (p) p.textContent = text;
  }
  static setCurrent(el: HTMLElement) {
    TranslationPopup.currentWord = el;
  }
  static hideDirectly() {
    clearTimeout(popupHideTimerId);
    TranslationPopup.currentWord = null;
    TranslationPopup.popup?.classList.remove("show");
  }
  static hide() {
    clearTimeout(popupHideTimerId);
    popupHideTimerId = setTimeout(() => {
      TranslationPopup.hideDirectly();
    }, 300);
  }
  static show() {
    TranslationPopup.popup?.classList.add("show");
  }
}

function isLightColor(color: string) {
  return tinycolor(color).isLight();
}

async function showTranslation(el: HTMLElement, word: string) {
  if (!word) return;
  TranslationPopup.hideDirectly();

  const translation = await getTranslation(word);
  logger.log("showTranslation", translation);

  const popup = TranslationPopup.get();
  TranslationPopup.setText(translation ? translation : "点击跳转谷歌翻译");
  TranslationPopup.setCurrent(el);
  const { x, y, width, height } = el.getBoundingClientRect();
  const X = x;
  const Y = y;

  popup.classList.add("show");
  popup.style.setProperty("--INSIGHT_WORD_POPUP_LEFT", `${X.toFixed()}px`);
  popup.style.setProperty("--INSIGHT_WORD_POPUP_RIGHT", `unset`);
  popup.style.setProperty(
    "--INSIGHT_WORD_POPUP_TOP",
    `${(Y + height + 0).toFixed()}px`
  );

  const {
    x: popupX,
    y: popupY,
    width: popupWidth,
    height: popupHeight,
  } = popup.getBoundingClientRect();

  const docWidth =
    document.documentElement.clientWidth || document.body.clientWidth;
  const docHeight =
    document.documentElement.clientHeight || document.body.clientHeight;
  const isLightFontColor = isLightColor(
    getComputedStyle(el).getPropertyValue("color")
  );

  popup.classList.toggle("dark", isLightFontColor);
  popup.classList.toggle("light", !isLightFontColor);

  if (Math.abs(popupX + popupWidth - docWidth) <= 2) {
    popup.style.setProperty("--INSIGHT_WORD_POPUP_LEFT", `unset`);
    popup.style.setProperty("--INSIGHT_WORD_POPUP_RIGHT", `0px`);
  }

  if (popupY + popupHeight > docHeight - 2) {
    popup.style.setProperty(
      "--INSIGHT_WORD_POPUP_TOP",
      `${(Y - popupHeight - 5).toFixed()}px`
    );
  }
}

function onMouseEnter(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.classList.contains(HIGHLIGHT_CLASS)) return;
  showTranslation(el, el.textContent ?? "");
  clearTimeout(popupHideTimerId);
}

function onMouseLeave(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.classList.contains(HIGHLIGHT_CLASS)) return;
  TranslationPopup.hide();
}

function createHighlight(text: string, percent: number, lemma: string) {
  // logger.log("createHighlight", text);
  const highlight = document.createElement("insight-word");
  highlight.classList.add(HIGHLIGHT_CLASS);
  highlight.textContent = text;
  highlight.dataset.percent = percent.toFixed(0);
  highlight.dataset.lemma = lemma;
  highlight.addEventListener("click", onClick);

  highlight.addEventListener("mouseenter", onMouseEnter);
  highlight.addEventListener("mouseleave", onMouseLeave);
  return highlight;
}

var good_tags_list = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "B",
  "SMALL",
  "STRONG",
  "Q",
  "DIV",
  "SPAN",
  "EM",
  "A",
  "SUMMARY",
]);

function mygoodfilter(node: Node) {
  const parentNode = node.parentNode as any;
  const tagName = parentNode?.tagName ?? "";

  if (!good_tags_list.has(tagName)) return NodeFilter.FILTER_SKIP;
  if (parentNode.classList?.has?.(HIGHLIGHT_IGNORE_CLASS))
    return NodeFilter.FILTER_SKIP;
  const hasFlex =
    getComputedStyle(parentNode)
      ?.getPropertyValue("display")
      ?.includes("flex") ?? false;
  if (hasFlex) return NodeFilter.FILTER_SKIP;

  return NodeFilter.FILTER_ACCEPT;
}

function textNodesUnder(el: Node) {
  var n,
    a = [],
    walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, mygoodfilter);
  while ((n = walk.nextNode())) {
    a.push(n);
  }
  return a;
}

var myre = /\w+/g;

function textToHighlightNodes(text: string, dst: Node[]) {
  var lc_text = text; //text.toLowerCase();
  var ws_text = lc_text.replace(
    /[,;()?!`:"'.\s\-\u2013\u2014\u201C\u201D\u2019]/g,
    " "
  );
  var ws_text = ws_text.replace(/[^\w ]/g, ".");
  var tokens = ws_text.split(" ");

  let array1: RegExpExecArray | null;

  const matchs: Array<{
    word: string;
    begin: number;
    end: number;
    percent: number;
    lemma: string;
  }> = [];
  while ((array1 = myre.exec(lc_text)) !== null) {
    const word = array1[0];
    const [result, percent, lemma] = Helper.match(word);
    if (result) {
      matchs.push({
        word,
        begin: array1.index,
        end: myre.lastIndex,
        percent,
        lemma,
      });
    }
  }

  var last_hl_end_pos = 0;
  var insert_count = 0;

  for (const match of matchs) {
    insert_count += 1;

    if (last_hl_end_pos < match.begin) {
      dst.push(
        document.createTextNode(text.slice(last_hl_end_pos, match.begin))
      );
    }
    last_hl_end_pos = match.end;

    dst.push(
      createHighlight(
        text.slice(match.begin, last_hl_end_pos),
        match.percent,
        match.lemma
      )
    );
  }

  if (matchs.length > 0 && last_hl_end_pos < text.length) {
    dst.push(document.createTextNode(text.slice(last_hl_end_pos, text.length)));
  }
  return insert_count;
}

function doHighlightText(textNodes: Node[]) {
  if (textNodes === null) {
    return;
  }
  var num_found = 0;
  for (var i = 0; i < textNodes.length; i++) {
    const node = textNodes[i] as any;
    if (node.offsetParent === null) {
      continue;
    }
    const text = textNodes[i].textContent;
    if (!text) {
      continue;
    }
    if (text.length <= 3) {
      continue;
    }
    if (text.indexOf("{") !== -1 && text.indexOf("}") !== -1) {
      continue; //pathetic hack to skip json data in text (e.g. google images use it).
    }
    const new_children: Node[] = [];
    const found_count = textToHighlightNodes(text, new_children);

    const parent_node = textNodes[i].parentNode;

    if (found_count && parent_node) {
      num_found += found_count;

      for (var j = 0; j < new_children.length; j++) {
        parent_node?.insertBefore(new_children[j], textNodes[i]);
      }
      parent_node.removeChild(textNodes[i]);
    }
    if (num_found > 10000)
      //limiting number of words to highlight
      break;
  }
}

function findHighlightNode(node: Node = document.body) {
  logger.log("findHighlightNode");

  if (Setting.enable) {
    Helper.loadData();
    doHighlightText(textNodesUnder(node));
  }
}

function toggleHightlightStyle(enable = Setting.enable) {
  logger.log("toggleHightlightStyle", enable);
  document.body.classList.toggle("insight-word-enable", enable);
}

function updateHightlightStyleByPercent() {
  logger.log("updateHightlightStyleByPercent");

  document.querySelectorAll("insight-word").forEach((i) => {
    const e = i as HTMLElement;
    if (e.dataset?.percent) {
      const percent = parseInt(e.dataset.percent);
      i.classList.toggle(HIGHLIGHT_CLASS, Setting.inRange(percent));
    }
  });
}

function updateHightlightStyleByIgnore() {
  logger.log("updateHightlightStyleByIgnore");

  document.querySelectorAll("insight-word").forEach((i) => {
    const e = i as HTMLElement;
    const lemma = e.dataset?.lemma ?? "";

    if (lemma) {
      const percent = Helper.getWordPercent(lemma);

      e.dataset.percent = percent.toFixed();
      i.classList.toggle(HIGHLIGHT_CLASS, Setting.inRange(percent));
    }
  });
}

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  runAt: "document_idle",
  main() {
    logger.log("Hello content.");

    const init = async () => {
      const support = await Setting.isSupported();
      if (!support) {
        logger.log("ignore it");
        return;
      }

      await Setting.load();
      const mode = Setting.mode;
      const percent = await storage.getItem<number>("local:percent");
      logger.log("local:mode", mode);
      logger.log("local:percent", percent);

      Setting.trySetFilterPercent(percent);
      await Helper.loadData();
      toggleHightlightStyle();

      const watchCbSiteMode = (value: SitMode, old: SitMode) => {
        logger.log("watch site-mode", value);

        if (value) {
          Setting.siteMode = value;
          Setting.checkEnable();
          toggleHightlightStyle();
        }
      };

      const watchCbMode: WatchCallback<GlobalMode | null> = (
        newValue,
        oldValue
      ) => {
        logger.log("watch local:mode", newValue);

        if (newValue) {
          Setting.mode = newValue;
          Setting.checkEnable();
          toggleHightlightStyle();
        }
      };

      const watchCbFilter: WatchCallback<number | null> = (
        newValue,
        oldValue
      ) => {
        logger.log("watch local:mode", newValue);

        if (Setting.trySetFilterPercent(newValue)) {
          if (newValue && oldValue && newValue < oldValue) {
            findHighlightNode();
          }
          updateHightlightStyleByPercent();
        }
      };

      const watchCbIgnoreWord: WatchCallback<string[] | null> = (
        newValue,
        oldValue
      ) => {
        logger.log("watch local:ignore-word", newValue);
        if (newValue) Helper.updataIgnore(newValue);
        updateHightlightStyleByIgnore();
      };
      const syncSetting = async () => {
        const siteMode = await Setting.getSiteModeFromBG();
        const mode = await storage.getItem<GlobalMode>("local:mode");
        const percent = await storage.getItem<number>("local:percent");
        const ignoreWord = await storage.getItem<string[]>("local:ignore-word");

        if (siteMode !== Setting.siteMode) {
          watchCbSiteMode(siteMode, Setting.siteMode);
        }

        if (mode !== Setting.mode) {
          watchCbMode(mode, Setting.mode);
        }

        if (percent !== Setting.filterPercent) {
          watchCbFilter(percent, Setting.filterPercent);
        }
        if (ignoreWord?.length !== Helper.ignoreSet.size) {
          watchCbIgnoreWord(ignoreWord, []);
        }
      };

      let unwatchList: Unwatch[] = [];
      const unwatchAll = () => {
        unwatchList.forEach((unwatch) => {
          unwatch();
        });

        unwatchList = [];
      };

      const watchAll = () => {
        unwatchAll();
        unwatchList.push(
          onMessage("notifySiteModeChanged", (message) => {
            const siteMode = message.data;
            if (siteMode !== Setting.siteMode)
              watchCbSiteMode(siteMode, Setting.siteMode);
          })
        );
        unwatchList.push(storage.watch<GlobalMode>("local:mode", watchCbMode));
        unwatchList.push(storage.watch<number>("local:percent", watchCbFilter));
        unwatchList.push(
          storage.watch<string[]>("local:ignore-word", watchCbIgnoreWord)
        );
      };

      watchAll();

      document.addEventListener("visibilitychange", () => {
        logger.log("visibilitychange", document.visibilityState);
        if (document.visibilityState === "visible") {
          syncSetting();
          watchAll();
        } else {
          unwatchAll();
        }
      });

      let observer = new MutationObserver(function (mutationsList) {
        if (!Setting.enable) return;

        for (let mutation of mutationsList) {
          for (let node of mutation.addedNodes) {
            let inobj = node as HTMLElement;
            if (!inobj) continue;
            try {
              if (
                !inobj.classList.contains(HIGHLIGHT_CLASS) &&
                !inobj.classList.contains(HIGHLIGHT_IGNORE_CLASS)
              ) {
                findHighlightNode(inobj);
              }
            } catch (e) {
              return;
            }
          }
        }
      });

      observer.observe(document, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
      });

      setTimeout(() => {
        logger.log("timeout 1000");
        findHighlightNode();
      }, 1000);
    };

    init();
  },
});
