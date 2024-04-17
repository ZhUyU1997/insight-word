import { logger } from "../common/logger";
import { WordEvent } from "./App";
import { Helper } from "./helper";
import { Setting } from "./setting";
import { getTranslationFromCache } from "./translate";

function onMouseEnter(e: MouseEvent) {
  WordEvent.emit("mouseenter", e);
}

function onMouseLeave(e: MouseEvent) {
  WordEvent.emit("mouseleave", e);
}

function onClick(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!Highlight.isClickable(el.classList)) return;

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

function createHighlight(text: string, percent: number, lemma: string) {
  // logger.log("createHighlight", text);
  const highlight = document.createElement("insight-word");
  highlight.classList.add(Highlight.CLASS);
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
  if (parentNode.classList?.has?.(Highlight.IGNORE_CLASS))
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

export class Highlight {
  static CLASS = "insight-word-highlight";
  static IGNORE_CLASS = "insight-word-ignore";

  static isClickable(classList: DOMTokenList) {
    return (
      classList &&
      classList.contains(Highlight.CLASS) &&
      !classList.contains(Highlight.IGNORE_CLASS)
    );
  }
  static find(node: Node = document.body) {
    logger.log("find node");

    if (Setting.enable) {
      Helper.loadData();
      doHighlightText(textNodesUnder(node));
    }
  }

  static toggleStyle(enable = Setting.enable) {
    logger.log("toggleStyle", enable);
    document.body.classList.toggle("insight-word-enable", enable);
  }

  static updateStyleByPercent() {
    logger.log("updateStyleByPercent");

    document.querySelectorAll("insight-word").forEach((i) => {
      const e = i as HTMLElement;
      if (e.dataset?.percent) {
        const percent = parseInt(e.dataset.percent);
        i.classList.toggle(Highlight.CLASS, Setting.inRange(percent));
      }
    });
  }

  static updateStyleByIgnore() {
    logger.log("updateByIgnore");

    document.querySelectorAll("insight-word").forEach((i) => {
      const e = i as HTMLElement;
      const lemma = e.dataset?.lemma ?? "";

      if (lemma) {
        const percent = Helper.getWordPercent(lemma);

        e.dataset.percent = percent.toFixed();
        i.classList.toggle(Highlight.CLASS, Setting.inRange(percent));
      }
    });
  }
}
