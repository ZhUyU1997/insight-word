import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  changeSetting({ enable }: { enable: boolean }): void;
  notifyBackground({ url, hidden }: { url: string; hidden: boolean }): void;
  translation({ words }: { words: string[] }): Record<string, string>;
  ignoreListHas(hostname: string): boolean;
  ignoreListAdd(hostname: string): void;
  ignoreListRemove(hostname: string): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
