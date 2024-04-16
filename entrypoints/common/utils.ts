import { GlobalMode, SitMode } from "./messaging";

export function IsSupported(mode: GlobalMode, siteMode: SitMode) {
  return (
    (mode === "enable" && siteMode !== "exclude") ||
    (mode === "disable" && siteMode === "include")
  );
}
