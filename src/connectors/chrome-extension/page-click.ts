export type ClickableCandidate = {
  text?: string;
  ariaLabel?: string;
  title?: string;
  value?: string;
  placeholder?: string;
  visible: boolean;
  disabled: boolean;
  tagName?: string;
  role?: string;
  href?: string;
};

export type PageClickRequest = {
  text: string;
  exact?: boolean;
};

export type PageClickResult =
  | {
      ok: true;
      matchedText: string;
      tagName: string;
      role: string | null;
      href: string | null;
    }
  | {
      ok: false;
      error: string;
    };

export function normalizeClickText(text: string | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function candidateSearchTerms(candidate: ClickableCandidate): string[] {
  return [
    candidate.text,
    candidate.ariaLabel,
    candidate.title,
    candidate.value,
    candidate.placeholder,
  ]
    .map((value) => normalizeClickText(value))
    .filter((value) => value.length > 0);
}

export function selectClickCandidate(
  candidates: ClickableCandidate[],
  text: string,
  exact = false,
): ClickableCandidate | null {
  const needle = normalizeClickText(text);
  if (!needle) return null;

  for (const candidate of candidates) {
    if (!candidate.visible || candidate.disabled) continue;

    const matches = candidateSearchTerms(candidate).some((value) =>
      exact ? value === needle : value.includes(needle),
    );

    if (matches) {
      return candidate;
    }
  }

  return null;
}

export function clickElementByTextInPage(request: PageClickRequest): PageClickResult {
  const normalize = (text: string | undefined): string =>
    (text ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  const collectTerms = (element: Element): string[] => {
    const htmlElement = element as HTMLElement;
    const inputElement = element as HTMLInputElement;

    return [
      htmlElement.innerText,
      htmlElement.textContent ?? undefined,
      element.getAttribute("aria-label") ?? undefined,
      element.getAttribute("title") ?? undefined,
      inputElement.value,
      inputElement.placeholder,
    ]
      .map((value) => normalize(value))
      .filter((value) => value.length > 0);
  };

  const isVisible = (element: Element): boolean => {
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    const style = window.getComputedStyle(htmlElement);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  };

  const isDisabled = (element: Element): boolean => {
    const htmlElement = element as HTMLElement;
    return (
      htmlElement.hasAttribute("disabled") ||
      htmlElement.getAttribute("aria-disabled") === "true"
    );
  };

  const needle = normalize(request.text);
  if (!needle) {
    return {
      ok: false,
      error: "click requires non-empty text",
    };
  }

  const typeableInputSelector = [
    "input:not([type])",
    "input[type='text']",
    "input[type='search']",
    "input[type='email']",
    "input[type='url']",
    "input[type='tel']",
    "input[type='password']",
    "input[type='number']",
  ].join(", ");
  const selector =
    `a[href], button, summary, input[type='button'], input[type='submit'], ${typeableInputSelector}, textarea, [contenteditable='true'], [contenteditable=''], [contenteditable='plaintext-only'], [role='button'], [role='link'], [onclick]`;
  const seen = new Set<Element>();
  const elements = Array.from(document.querySelectorAll(selector)).filter((element) => {
    if (seen.has(element)) return false;
    seen.add(element);
    return true;
  });

  const matchedElement =
    elements.find((element) => {
      if (!isVisible(element) || isDisabled(element)) return false;

      return collectTerms(element).some((value) =>
        request.exact ? value === needle : value.includes(needle),
      );
    }) ?? null;

  if (!matchedElement) {
    return {
      ok: false,
      error: `No visible interactive element matched '${request.text}'`,
    };
  }

  const htmlElement = matchedElement as HTMLElement;
  htmlElement.scrollIntoView({
    block: "center",
    inline: "center",
  });
  htmlElement.focus();
  htmlElement.click();

  return {
    ok: true,
    matchedText:
      htmlElement.innerText?.trim() ||
      htmlElement.textContent?.trim() ||
      matchedElement.getAttribute("aria-label") ||
      matchedElement.getAttribute("title") ||
      (matchedElement as HTMLInputElement).value ||
      "",
    tagName: matchedElement.tagName.toLowerCase(),
    role: matchedElement.getAttribute("role"),
    href: matchedElement instanceof HTMLAnchorElement ? matchedElement.href : null,
  };
}
