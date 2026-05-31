const TOKEN_RE = /[\p{L}\p{N}]+(?:['_-][\p{L}\p{N}]+)*/gu;
const PROCESSED_ATTR = "data-contextglide-processed";
const ENABLED_KEY = "contextGlideEnabled";
const SHORTCUT_KEY = "contextGlideShortcut";

let enabled = true;
let toggleShortcut = defaultShortcut();
let segmenter = null;

try {
  segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
} catch (_error) {
  segmenter = null;
}

init();

async function init() {
  const settings = await chrome.storage.sync.get({
    [ENABLED_KEY]: true,
    [SHORTCUT_KEY]: defaultShortcut()
  });
  enabled = Boolean(settings[ENABLED_KEY]);
  toggleShortcut = settings[SHORTCUT_KEY] || defaultShortcut();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[ENABLED_KEY]) {
      enabled = Boolean(changes[ENABLED_KEY].newValue);
      document.documentElement.classList.toggle("contextglide-disabled", !enabled);
      if (enabled) {
        annotatePage();
      } else {
        restorePageText();
      }
    }
    if (area === "sync" && changes[SHORTCUT_KEY]) {
      toggleShortcut = changes[SHORTCUT_KEY].newValue || defaultShortcut();
    }
  });

  document.addEventListener("keydown", handleShortcut, true);

  if (enabled) {
    annotatePage();
  }

  document.documentElement.classList.toggle("contextglide-disabled", !enabled);
}

async function handleShortcut(event) {
  if (isEditableTarget(event.target) || !matchesShortcut(event, toggleShortcut)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  enabled = !enabled;
  await chrome.storage.sync.set({ [ENABLED_KEY]: enabled });
}

function isEditableTarget(target) {
  return Boolean(
    target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']")
  );
}

function annotatePage() {
  const root = pickReadingRoot();
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !hasTranslatableToken(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;
        if (!parent || parent.closest("[data-contextglide-token]")) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest("script, style, noscript, textarea, input, select, option, code, pre, svg, canvas, iframe")) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest(`[${PROCESSED_ATTR}]`)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    replaceTextNode(node);
  }
}

function restorePageText() {
  const wrappers = Array.from(document.querySelectorAll(`[${PROCESSED_ATTR}]`));
  for (const wrapper of wrappers) {
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(wrapper.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.matches("[data-contextglide-token]")) {
        fragment.append(document.createTextNode(child.dataset.contextglideToken || child.textContent || ""));
      } else {
        fragment.append(child);
      }
    }
    wrapper.replaceWith(fragment);
  }
}

function pickReadingRoot() {
  return (
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector(".entry-content") ||
    document.querySelector(".post-content") ||
    document.body
  );
}

function replaceTextNode(node) {
  const text = node.nodeValue;
  const tokens = getTokenRanges(text);
  if (tokens.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const token of tokens) {
    if (token.index > lastIndex) {
      fragment.append(document.createTextNode(text.slice(lastIndex, token.index)));
    }

    fragment.append(createTokenSpan(token.value));
    lastIndex = token.index + token.value.length;
  }

  if (lastIndex < text.length) {
    fragment.append(document.createTextNode(text.slice(lastIndex)));
  }

  const wrapper = document.createElement("span");
  wrapper.setAttribute(PROCESSED_ATTR, "true");
  wrapper.append(fragment);
  node.replaceWith(wrapper);
}

function getTokenRanges(text) {
  if (segmenter) {
    const ranges = [];
    for (const item of segmenter.segment(text)) {
      if (item.isWordLike && shouldTranslateToken(item.segment)) {
        ranges.push({
          value: item.segment,
          index: item.index
        });
      }
    }
    return ranges;
  }

  return Array.from(text.matchAll(TOKEN_RE))
    .filter((match) => shouldTranslateToken(match[0]))
    .map((match) => ({
      value: match[0],
      index: match.index
    }));
}

function hasTranslatableToken(text) {
  return getTokenRanges(text).length > 0;
}

function shouldTranslateToken(token) {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return false;
  }

  if (/^\d+([.,:/-]\d+)*$/.test(normalized)) {
    return false;
  }

  return /[\p{L}]/u.test(normalized);
}

function createTokenSpan(token) {
  const span = document.createElement("span");
  span.className = "contextglide-token";
  span.dataset.contextglideToken = token;
  span.tabIndex = 0;
  span.setAttribute("role", "button");
  span.setAttribute("aria-label", `Translate ${token}`);

  const original = document.createElement("span");
  original.className = "contextglide-original";
  original.textContent = token;

  const meaning = document.createElement("span");
  meaning.className = "contextglide-meaning";
  meaning.setAttribute("aria-hidden", "true");
  meaning.textContent = "";

  span.append(original, meaning);
  span.addEventListener("click", () => handleTranslate(span));
  span.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTranslate(span);
    }
  });

  return span;
}

async function handleTranslate(span) {
  if (!enabled || span.dataset.loading === "true") {
    return;
  }

  const token = span.dataset.contextglideToken;
  const meaning = span.querySelector(".contextglide-meaning");
  if (meaning.textContent && !span.classList.contains("contextglide-error")) {
    return;
  }

  span.dataset.loading = "true";
  span.classList.remove("contextglide-error");
  meaning.textContent = "...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "translate-token",
      token,
      context: getTokenContext(span)
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Translation failed.");
    }

    meaning.textContent = response.translation;
  } catch (error) {
    span.classList.add("contextglide-error");
    meaning.textContent = "!";
    span.title = error.message;
  } finally {
    span.dataset.loading = "false";
  }
}

function getTokenContext(span) {
  const container = span.closest("p, li, blockquote, h1, h2, h3, h4, h5, h6, div, article, main") || document.body;
  const clone = container.cloneNode(true);

  for (const meaning of clone.querySelectorAll(".contextglide-meaning")) {
    meaning.remove();
  }

  const text = clone.textContent.replace(/\s+/g, " ").trim();
  if (text.length <= 1000) {
    return text;
  }

  const token = span.dataset.contextglideToken || "";
  const index = text.toLowerCase().indexOf(token.toLowerCase());
  if (index < 0) {
    return text.slice(0, 1000);
  }

  const start = Math.max(0, index - 480);
  const end = Math.min(text.length, index + token.length + 480);
  return text.slice(start, end);
}

function normalizeToken(token) {
  return String(token || "")
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
    .trim();
}

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}

function matchesShortcut(event, shortcut) {
  const parts = String(shortcut || "")
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  const key = normalizeShortcutKey(event.key).toLowerCase();
  const expectedKey = parts.at(-1);
  const wantsCtrl = parts.includes("ctrl");
  const wantsCommand = parts.includes("command") || parts.includes("meta");
  const wantsAlt = parts.includes("alt");
  const wantsShift = parts.includes("shift");

  return (
    key === expectedKey &&
    event.ctrlKey === wantsCtrl &&
    event.metaKey === wantsCommand &&
    event.altKey === wantsAlt &&
    event.shiftKey === wantsShift
  );
}

function normalizeShortcutKey(key) {
  if (key === " ") {
    return "Space";
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  const aliases = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Meta: "Command"
  };
  return aliases[key] || key;
}
