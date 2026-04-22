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

export function pickTargetTab<T extends TabLike>(tabs: T[]): T | null {
  const supported = tabs.filter((tab) => isSupportedBrowserUrl(tab.url));
  if (supported.length === 0) return null;

  return supported.find((tab) => tab.active) ?? supported[0] ?? null;
}

export function findTabById<T extends TabLike>(tabs: T[], tabId: string): T | null {
  return (
    tabs.find((tab) => isSupportedBrowserUrl(tab.url) && String(tab.id) === tabId) ?? null
  );
}
