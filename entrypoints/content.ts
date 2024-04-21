import "./index.less";
import {
  GlobalMode,
  SitMode,
  onMessage,
  sendMessage,
} from "./common/messaging";
import { Unwatch, WatchCallback } from "wxt/storage";
import { logger } from "./common/logger";
import Render from "./page/render";
import { Helper } from "./page/helper";
import { Setting } from "./page/setting";
import { Highlight } from "./page/highlight";
import { Preference, safeStorage } from "./common/storage";

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  runAt: "document_idle",

  async main(ctx: any) {
    logger.log("Hello content.");
    const support = await Setting.isSupported();
    if (!support) {
      logger.log("ignore it");
      return;
    }

    await Setting.load();
    const mode = Setting.mode;
    const percent = await safeStorage.getItem("local:percent");
    logger.log("local:mode", mode);
    logger.log("local:percent", percent);

    Setting.trySetFilterPercent(percent);
    await Helper.loadData();
    Highlight.toggleStyle();

    const watchCbSiteMode = (value: SitMode, old: SitMode) => {
      logger.log("watch site-mode", value);

      if (value) {
        Setting.siteMode = value;
        Setting.checkEnable();
        Highlight.toggleStyle();
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
        Highlight.toggleStyle();
      }
    };

    const watchCbFilter: WatchCallback<number | null> = (
      newValue,
      oldValue
    ) => {
      logger.log("watch local:mode", newValue);

      if (Setting.trySetFilterPercent(newValue)) {
        if (newValue && oldValue && newValue < oldValue) {
          Highlight.find();
        }
        Highlight.updateStyleByPercent();
      }
    };

    const watchCbIgnoreWord: WatchCallback<string[] | null> = (
      newValue,
      oldValue
    ) => {
      logger.log("watch local:ignore-word", newValue);
      if (newValue) Helper.updataIgnore(newValue);
      Highlight.updateStyleByIgnore();
    };

    const watchCbPreference: WatchCallback<Preference | null> = (
      newValue,
      oldValue
    ) => {
      logger.log("watch local:preference", newValue);
      if (newValue) {
        const old = Setting.preference.highlight;
        Setting.preference = newValue;
        sendMessage("replaceCSS", { old, css: Setting.preference.highlight });
      }
    };
    const syncSetting = async () => {
      const siteMode = await Setting.getSiteModeFromBG();
      const mode = await safeStorage.getItem("local:mode");
      const percent = await safeStorage.getItem("local:percent");
      const ignoreWord = await safeStorage.getItem("local:ignore-word");
      const preference = await safeStorage.getItem("local:preference");

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

      if (preference?.highlight !== Setting.preference.highlight) {
        watchCbPreference(preference, Setting.preference);
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
      unwatchList.push(safeStorage.watch("local:mode", watchCbMode));
      unwatchList.push(safeStorage.watch("local:percent", watchCbFilter));
      unwatchList.push(
        safeStorage.watch("local:ignore-word", watchCbIgnoreWord)
      );
      unwatchList.push(
        safeStorage.watch("local:preference", watchCbPreference)
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

    const observer = new MutationObserver(function (mutationsList) {
      if (!Setting.enable) return;

      for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
          const inobj = node as HTMLElement;
          if (!inobj) continue;
          try {
            if (
              !inobj.classList.contains(Highlight.CLASS) &&
              !inobj.classList.contains(Highlight.IGNORE_CLASS)
            ) {
              Highlight.find(inobj);
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
      Highlight.find();
    }, 1000);

    const ui = createIntegratedUi(ctx, {
      position: "inline",
      onMount: (container) => {
        // Container is a body, and React warns when creating a root on the body, so create a wrapper div
        const app = document.createElement("div");
        container.append(app);
        return Render(app);
      },
      onRemove: (root) => {
        // Unmount the root when the UI is removed
        root?.unmount();
      },
    });

    // 4. Mount the UI
    ui.mount();
  },
});
