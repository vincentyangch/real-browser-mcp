import type { ConnectorSnapshot } from "../../bridge/types.js";

export type BrowserTabLike = {
  id?: number | string;
  url?: string;
  title?: string;
  active?: boolean;
};

export function isSupportedBrowserUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

export function buildConnectorSnapshot(input: {
  connector: string;
  browser: ConnectorSnapshot["browser"];
  mode: ConnectorSnapshot["mode"];
  tabs: BrowserTabLike[];
  updatedAt?: string;
}): ConnectorSnapshot {
  const updatedAt = input.updatedAt ?? new Date().toISOString();

  return {
    connector: input.connector,
    browser: input.browser,
    mode: input.mode,
    updatedAt,
    tabs: input.tabs
      .filter((tab) => isSupportedBrowserUrl(tab.url))
      .map((tab) => ({
        id: String(tab.id ?? ""),
        url: String(tab.url ?? ""),
        title: String(tab.title ?? ""),
        active: Boolean(tab.active),
        lastSeenAt: updatedAt,
      })),
  };
}
