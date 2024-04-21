import { GetItemOptions, Unwatch, WatchCallback } from "wxt/storage";
import { LemmaData } from "./define";
import { GlobalMode, SitMode } from "./messaging";

export interface Preference {
  highlight: string;
}

interface StorageMap {
  "local:percent": number;
  "local:rank": string[];
  "local:lemma": LemmaData;
  "local:ignore-word": string[];
  "local:site-mode": Record<string, SitMode>;
  "local:mode": GlobalMode;
  "local:preference": Preference;
}

export interface GenericStorage<TStorageMap extends Record<string, any>> {
  getItem<K extends Extract<keyof TStorageMap, string>>(
    key: K,
    opts?: GetItemOptions<TStorageMap[K]>
  ): Promise<TStorageMap[K] | null>;
  setItem<K extends Extract<keyof TStorageMap, string>>(
    key: K,
    value: TStorageMap[K] | null
  ): Promise<void>;
  watch<K extends Extract<keyof TStorageMap, string>>(
    key: K,
    cb: WatchCallback<TStorageMap[K] | null>
  ): Unwatch;
  unwatch(): void;
}

declare type ExtensionMessenger<TStorageMap extends Record<string, any>> =
  GenericStorage<TStorageMap>;

function defineExtensionStorage<
  TStorageMap extends Record<string, any> = Record<string, any>
>(): ExtensionMessenger<TStorageMap> {
  return storage;
}

export const safeStorage = defineExtensionStorage<StorageMap>();
