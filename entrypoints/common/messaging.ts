import { defineExtensionMessaging } from "@webext-core/messaging";

export type GlobalMode = "enable" | "disable" | "forbidden";

export type SitMode = "follow" | "exclude" | "include";

export type SiteModeStorage = Record<string, SitMode>
interface ProtocolMap {
  changeSetting({ enable }: { enable: boolean }): void;
  notifyBackground({ url, hidden }: { url: string; hidden: boolean }): void;
  translation({ words }: { words: string[] }): Record<string, string>;
  getGlobalMode(): GlobalMode;
  // setGlobalMode(mode: GlobalMode): void;
  getSiteMode(hostName: string): SitMode;
  setSiteMode({ hostName, mode }: { hostName: string; mode: SitMode }): void;
  notifySiteModeChanged(mode: SitMode) : void

  isSupported(hostName: string): boolean;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
