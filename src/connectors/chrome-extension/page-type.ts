export type EditableTargetSnapshot = {
  tagName?: string;
  inputType?: string | null;
  isContentEditable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

export type PageTypeRequest = {
  text: string;
  clear?: boolean;
};

export type PageTypeResult =
  | {
      ok: true;
      tagName: string;
      inputType: string | null;
      clear: boolean;
      value: string;
    }
  | {
      ok: false;
      error: string;
    };

const TYPEABLE_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);

export function isSupportedEditableTarget(target: EditableTargetSnapshot): boolean {
  if (target.disabled || target.readOnly) return false;
  if (target.isContentEditable) return true;

  const tagName = (target.tagName ?? "").toLowerCase();
  if (tagName === "textarea") return true;
  if (tagName !== "input") return false;

  const inputType = (target.inputType ?? "").toLowerCase();
  return TYPEABLE_INPUT_TYPES.has(inputType);
}

export function typeIntoFocusedElementInPage(request: PageTypeRequest): PageTypeResult {
  const supportedInputTypes = new Set([
    "",
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
  ]);

  const isSupported = (target: EditableTargetSnapshot): boolean => {
    if (target.disabled || target.readOnly) return false;
    if (target.isContentEditable) return true;

    const tagName = (target.tagName ?? "").toLowerCase();
    if (tagName === "textarea") return true;
    if (tagName !== "input") return false;

    const inputType = (target.inputType ?? "").toLowerCase();
    return supportedInputTypes.has(inputType);
  };

  if (!request.text) {
    return {
      ok: false,
      error: "type requires non-empty text",
    };
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return {
      ok: false,
      error: "No focused element available for typing",
    };
  }

  const snapshot: EditableTargetSnapshot = {
    tagName: activeElement.tagName,
    inputType: activeElement instanceof HTMLInputElement ? activeElement.type : null,
    isContentEditable: activeElement.isContentEditable,
    disabled:
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
        ? activeElement.disabled
        : activeElement.getAttribute("aria-disabled") === "true",
    readOnly:
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
        ? activeElement.readOnly
        : activeElement.getAttribute("aria-readonly") === "true",
  };

  if (!isSupported(snapshot)) {
    return {
      ok: false,
      error: "Focused element is not an editable text target",
    };
  }

  activeElement.focus();

  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = request.clear ? 0 : (activeElement.selectionStart ?? activeElement.value.length);
    const end = request.clear ? activeElement.value.length : (activeElement.selectionEnd ?? activeElement.value.length);

    activeElement.setRangeText(request.text, start, end, "end");
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    activeElement.dispatchEvent(new Event("change", { bubbles: true }));

    return {
      ok: true,
      tagName: activeElement.tagName.toLowerCase(),
      inputType: activeElement instanceof HTMLInputElement ? activeElement.type : null,
      clear: request.clear ?? false,
      value: activeElement.value,
    };
  }

  if (activeElement.isContentEditable) {
    const existing = request.clear ? "" : (activeElement.textContent ?? "");
    activeElement.textContent = `${existing}${request.text}`;
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    activeElement.dispatchEvent(new Event("change", { bubbles: true }));

    return {
      ok: true,
      tagName: activeElement.tagName.toLowerCase(),
      inputType: null,
      clear: request.clear ?? false,
      value: activeElement.textContent ?? "",
    };
  }

  return {
    ok: false,
    error: "Focused element is not an editable text target",
  };
}
