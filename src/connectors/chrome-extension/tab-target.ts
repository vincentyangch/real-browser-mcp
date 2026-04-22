export type TabLike = {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
};

function isSupportedBrowserUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

export function pickTargetTab(tabs: TabLike[]): TabLike | null {
  const supported = tabs.filter((tab) => isSupportedBrowserUrl(tab.url));
  if (supported.length === 0) return null;

  return supported.find((tab) => tab.active) ?? supported[0] ?? null;
}
