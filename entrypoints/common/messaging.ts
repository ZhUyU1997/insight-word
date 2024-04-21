import { defineExtensionMessaging } from "@webext-core/messaging";

export type GlobalMode = "enable" | "disable" | "forbidden";

export type SitMode = "follow" | "exclude" | "include";

export type SiteModeStorage = Record<string, SitMode>;
interface ProtocolMap {
  changeSetting(data: { enable: boolean }): void;
  notifyBackground(data: { url: string; hidden: boolean }): void;
  translation(data: { words: string[] }): Record<string, string>;
  getGlobalMode(): GlobalMode;
  // setGlobalMode(mode: GlobalMode): void;
  getSiteMode(hostName: string): SitMode;
  setSiteMode(data: { hostName: string; mode: SitMode }): void;
  notifySiteModeChanged(mode: SitMode): void;

  isSupported(hostName: string): boolean;
  replaceCSS(data: { old:string, css: string }): void;

  injectCSS(data: { css: string }): void;
  removeCSS(data: { css: string }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
