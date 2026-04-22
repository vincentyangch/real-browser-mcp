export type ScrollDirection = "up" | "down";

export type PageScrollRequest = {
  direction: ScrollDirection;
  pages?: number;
};

export type PageScrollResult =
  | {
      ok: true;
      direction: ScrollDirection;
      pages: number;
      deltaY?: number;
      scrollY?: number;
      viewportHeight?: number;
      documentHeight?: number;
    }
  | {
      ok: false;
      error: string;
    };

export function normalizeScrollPages(pages: number | undefined): number {
  if (typeof pages !== "number" || !Number.isFinite(pages) || pages <= 0) {
    return 1;
  }

  return pages;
}

export function computeScrollDelta(
  direction: ScrollDirection,
  pages: number,
  viewportHeight: number,
): number {
  const distance = normalizeScrollPages(pages) * viewportHeight;
  return direction === "up" ? -distance : distance;
}

export function scrollPageInWindow(request: PageScrollRequest): PageScrollResult {
  const normalizePages = (pages: number | undefined): number => {
    if (typeof pages !== "number" || !Number.isFinite(pages) || pages <= 0) {
      return 1;
    }

    return pages;
  };

  const computeDelta = (
    direction: ScrollDirection,
    pages: number,
    viewportHeight: number,
  ): number => {
    const distance = normalizePages(pages) * viewportHeight;
    return direction === "up" ? -distance : distance;
  };

  if (request.direction !== "up" && request.direction !== "down") {
    return {
      ok: false,
      error: `Unsupported scroll direction: ${String(request.direction)}`,
    };
  }

  const pages = normalizePages(request.pages);
  const viewportHeight = window.innerHeight;
  const deltaY = computeDelta(request.direction, pages, viewportHeight);

  window.scrollBy({
    top: deltaY,
    left: 0,
    behavior: "auto",
  });

  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
  );

  return {
    ok: true,
    direction: request.direction,
    pages,
    deltaY,
    scrollY: window.scrollY,
    viewportHeight,
    documentHeight,
  };
}
