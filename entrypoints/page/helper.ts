import { LemmaData } from "../common/define";
import { logger } from "../common/logger";
import { Setting } from "./setting";

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
  
  export const Helper = new WordHelper();