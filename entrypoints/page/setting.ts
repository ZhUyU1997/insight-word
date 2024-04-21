import { logger } from "../common/logger";
import { GlobalMode, SitMode, sendMessage } from "../common/messaging";
import { Preference, safeStorage } from "../common/storage";
import { DEFAULT_HIGHLIGHT_STYLE } from "../common/style";
import { IsSupported } from "../common/utils";

export class Setting {
  static mode: GlobalMode = "enable";
  static siteMode: SitMode = "follow";
  static enable = true;
  static filterPercent = 30;
  static preference: Preference = {
    highlight: DEFAULT_HIGHLIGHT_STYLE,
  };
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
    const mode = await safeStorage.getItem("local:mode");
    Setting.mode = mode ?? Setting.mode;
    const siteMode = await Setting.getSiteModeFromBG();
    Setting.siteMode = siteMode ?? Setting.siteMode;
    const preference = await safeStorage.getItem("local:preference");
    Setting.preference = preference ?? Setting.preference;
    if (await Setting.checkEnable()) {
      sendMessage("injectCSS", {
        css: Setting.preference.highlight,
      });
    }
  }
}
