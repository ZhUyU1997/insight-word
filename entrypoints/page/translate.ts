import { logger } from "../common/logger";
import { sendMessage } from "../common/messaging";
import { Helper } from "./helper";

const translationCache = new Map<string, string>();
export async function getTranslation(word: string) {
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
  return null;
}

export function getTranslationFromCache(word: string) {
  const _w = word.toLowerCase();
  const value = translationCache.get(_w);
  return value;
}
