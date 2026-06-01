const TOKEN_RE = /[\p{L}\p{N}]+(?:['_-][\p{L}\p{N}]+)*/gu;
const PROCESSED_ATTR = "data-contextglide-processed";
const SHORTCUT_KEY = "contextGlideShortcut";
const MODES = ["off", "word", "sentence"];
const ANCHOR_START = "\uE000";
const ANCHOR_END = "\uE001";

let mode = "off";
let toggleShortcut = defaultShortcut();
let segmenter = null;
let floatingButton = null;
let sentencePanel = null;
let sentenceSource = null;
let sentenceResult = null;
let sentenceFollowupForm = null;
let sentenceFollowupInput = null;
let sentenceFollowupThread = null;
let activeSentenceState = null;
let dragState = null;

try {
  segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
} catch (_error) {
  segmenter = null;
}

init();

async function init() {
  const settings = await chrome.storage.sync.get({
    [SHORTCUT_KEY]: defaultShortcut()
  });
  toggleShortcut = settings[SHORTCUT_KEY] || defaultShortcut();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[SHORTCUT_KEY]) {
      toggleShortcut = changes[SHORTCUT_KEY].newValue || defaultShortcut();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "contextglide-get-state") {
      sendResponse({ mode, enabled: mode !== "off" });
      return;
    }

    if (message?.type === "contextglide-cycle-mode") {
      setMode(nextMode(mode));
      sendResponse({ mode, enabled: mode !== "off" });
      return;
    }

    if (message?.type === "contextglide-set-mode") {
      setMode(MODES.includes(message.mode) ? message.mode : "off");
      sendResponse({ mode, enabled: mode !== "off" });
    }
  });

  document.addEventListener("keydown", handleShortcut, true);
  createFloatingControl();
  setMode("off");
}

function createFloatingControl() {
  if (floatingButton) {
    return;
  }

  floatingButton = document.createElement("button");
  floatingButton.type = "button";
  floatingButton.className = "contextglide-float contextglide-float-off";
  floatingButton.textContent = "CG";
  floatingButton.title = "ContextGlide: Off";
  floatingButton.setAttribute("aria-label", "Toggle ContextGlide mode");
  floatingButton.addEventListener("click", () => setMode(nextMode(mode)));
  floatingButton.addEventListener("pointerdown", startFloatDrag);
  document.documentElement.append(floatingButton);
}

function setMode(next) {
  mode = next;
  document.documentElement.dataset.contextglideMode = mode;
  updateFloatingControl();

  if (mode === "off") {
    restorePageText();
    closeSentencePanel();
    return;
  }

  restorePageText();
  annotatePage();
  if (mode === "word") {
    closeSentencePanel();
  }
}

function nextMode(current) {
  if (current === "off") {
    return "word";
  }
  if (current === "word") {
    return "sentence";
  }
  return "off";
}

function updateFloatingControl() {
  if (!floatingButton) {
    return;
  }

  floatingButton.className = `contextglide-float contextglide-float-${mode}`;
  floatingButton.textContent = mode === "off" ? "CG" : mode === "word" ? "W" : "S";
  floatingButton.title = `ContextGlide: ${mode}`;
  positionPanelNearFloat();
}

function startFloatDrag(event) {
  if (event.button !== 0) {
    return;
  }

  dragState = {
    startY: event.clientY,
    startTop: floatingButton.getBoundingClientRect().top,
    moved: false
  };
  floatingButton.setPointerCapture(event.pointerId);
  floatingButton.addEventListener("pointermove", moveFloatDrag);
  floatingButton.addEventListener("pointerup", endFloatDrag, { once: true });
  floatingButton.addEventListener("pointercancel", endFloatDrag, { once: true });
}

function moveFloatDrag(event) {
  if (!dragState) {
    return;
  }

  const delta = event.clientY - dragState.startY;
  if (Math.abs(delta) > 4) {
    dragState.moved = true;
  }

  const nextTop = clamp(dragState.startTop + delta, 12, window.innerHeight - floatingButton.offsetHeight - 12);
  floatingButton.style.top = `${nextTop}px`;
  floatingButton.style.right = "12px";
  positionPanelNearFloat();
}

function endFloatDrag(event) {
  if (!dragState) {
    return;
  }

  floatingButton.releasePointerCapture?.(event.pointerId);
  floatingButton.removeEventListener("pointermove", moveFloatDrag);
  if (dragState.moved) {
    event.preventDefault();
    event.stopPropagation();
    suppressNextFloatClick();
  }
  dragState = null;
}

function suppressNextFloatClick() {
  const stopClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    floatingButton.removeEventListener("click", stopClick, true);
  };
  floatingButton.addEventListener("click", stopClick, true);
}

async function handleShortcut(event) {
  if (isEditableTarget(event.target) || !matchesShortcut(event, toggleShortcut)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  setMode(nextMode(mode));
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
        if (!parent || parent.closest("[data-contextglide-token], .contextglide-float, .contextglide-panel")) {
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
        fragment.append(document.createTextNode(child.dataset.contextglideToken || child.querySelector(".contextglide-original")?.textContent || ""));
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
  span.setAttribute("aria-label", `ContextGlide ${token}`);

  const original = document.createElement("span");
  original.className = "contextglide-original";
  original.textContent = token;

  const meaning = document.createElement("span");
  meaning.className = "contextglide-meaning";
  meaning.setAttribute("aria-hidden", "true");
  meaning.textContent = "";

  span.append(original, meaning);
  span.addEventListener("click", () => handleTokenClick(span));
  span.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTokenClick(span);
    }
  });

  return span;
}

async function handleTokenClick(span) {
  if (mode === "word") {
    await translateWordToken(span);
    return;
  }

  if (mode === "sentence") {
    await translateContainingSentence(span);
  }
}

async function translateWordToken(span) {
  if (span.dataset.loading === "true") {
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

async function translateContainingSentence(span) {
  const token = span.dataset.contextglideToken;
  const snapshot = getTokenSnapshot(span);
  const context = snapshot.context;
  const sentence = getContainingSentence(snapshot);
  activeSentenceState = {
    token,
    context,
    sentence,
    translation: ""
  };
  openSentencePanel(sentence, "Loading...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "translate-sentence",
      token,
      sentence,
      context
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Sentence translation failed.");
    }

    activeSentenceState.translation = response.translation;
    updateSentencePanel(sentence, response.translation);
  } catch (error) {
    updateSentencePanel(sentence, error.message);
  }
}

function getTokenContext(span) {
  return getTokenSnapshot(span).context;
}

function getTokenSnapshot(span) {
  const container = findContextContainer(span);
  const rawText = collectAnchoredText(container, span);
  const normalized = normalizeAnchoredText(rawText);
  const token = span.dataset.contextglideToken || "";
  const anchorStart = normalized.anchorStart;
  const anchorEnd = normalized.anchorEnd >= normalized.anchorStart ? normalized.anchorEnd : normalized.anchorStart + token.length;
  const source = normalized.text;

  if (source.length <= 1000) {
    return {
      context: source,
      contextStart: 0,
      anchorStart,
      anchorEnd,
      token
    };
  }

  const fallbackAnchor = anchorStart >= 0 ? anchorStart : Math.floor(source.length / 2);
  const start = Math.max(0, fallbackAnchor - 480);
  const end = Math.min(source.length, fallbackAnchor + token.length + 480);

  return {
    context: source.slice(start, end),
    contextStart: start,
    anchorStart: Math.max(0, fallbackAnchor - start),
    anchorEnd: Math.max(0, anchorEnd - start),
    token
  };
}

function findContextContainer(span) {
  const preferred = span.closest("p, li, blockquote, h1, h2, h3, h4, h5, h6");
  if (preferred) {
    return preferred;
  }

  let candidate = span.parentElement;
  let best = null;
  while (candidate && candidate !== document.body) {
    if (candidate.matches?.(".contextglide-token, .contextglide-original, .contextglide-meaning")) {
      candidate = candidate.parentElement;
      continue;
    }

    if (candidate.matches?.("article, main, section, div, td, th")) {
      const text = normalizeAnchoredText(collectAnchoredText(candidate, span)).text;
      if (!best || text.length < 1400) {
        best = candidate;
      }
      if (text.length >= 120 && /[.?!;:\u3002\uff1f\uff01\uff1b\uff1a]/.test(text)) {
        return candidate;
      }
    }

    candidate = candidate.parentElement;
  }

  return best || document.querySelector("article") || document.querySelector("main") || document.body;
}

function collectAnchoredText(container, anchorSpan) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest(".contextglide-meaning, .contextglide-float, .contextglide-panel")) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest("script, style, noscript, textarea, input, select, option, code, pre, svg, canvas, iframe")) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let text = "";
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest(".contextglide-original")?.parentElement === anchorSpan) {
      text += `${ANCHOR_START}${node.nodeValue}${ANCHOR_END}`;
    } else {
      text += node.nodeValue;
    }
  }

  return text;
}

function normalizeAnchoredText(text) {
  const withNormalizedSpace = String(text || "")
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/\s+([,.;:?!，。？！；：])/g, "$1")
    .replace(/([([{“‘])\s+/g, "$1")
    .trim();
  const anchorStart = withNormalizedSpace.indexOf(ANCHOR_START);
  const anchorEnd = withNormalizedSpace.indexOf(ANCHOR_END);
  const source = withNormalizedSpace
    .replaceAll(ANCHOR_START, "")
    .replaceAll(ANCHOR_END, "");

  return {
    text: source,
    anchorStart,
    anchorEnd: anchorEnd >= 0 && anchorStart >= 0 ? anchorEnd - ANCHOR_START.length : -1
  };
}

function getContainingSentence(snapshot) {
  const source = String(snapshot?.context || "").trim();
  if (!source) {
    return snapshot?.token || "";
  }

  const pivot = Number.isInteger(snapshot?.anchorStart) && snapshot.anchorStart >= 0
    ? Math.min(snapshot.anchorStart, source.length - 1)
    : findBestTokenIndex(source, snapshot?.token);
  const boundaries = ".?!;:\u3002\uff1f\uff01\uff1b\uff1a";
  let start = 0;
  let end = source.length;

  for (let index = pivot - 1; index >= 0; index -= 1) {
    if (boundaries.includes(source[index])) {
      start = index + 1;
      break;
    }
  }

  for (let index = pivot; index < source.length; index += 1) {
    if (boundaries.includes(source[index])) {
      end = index + 1;
      break;
    }
  }

  return source.slice(start, end).trim() || source;
}

function findBestTokenIndex(source, token) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    return Math.floor(source.length / 2);
  }

  const index = source.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase());
  return index >= 0 ? index : Math.floor(source.length / 2);
}

function openSentencePanel(sentence, result) {
  ensureSentencePanel();
  updateSentencePanel(sentence, result);
  sentencePanel.hidden = false;
  positionPanelNearFloat();
}

function updateSentencePanel(sentence, result) {
  ensureSentencePanel();
  if (sentenceFollowupThread && sentenceSource.textContent !== (sentence || "")) {
    sentenceFollowupThread.replaceChildren();
  }
  sentenceSource.textContent = sentence || "";
  sentenceResult.textContent = result || "";
}

function ensureSentencePanel() {
  if (sentencePanel) {
    return;
  }

  sentencePanel = document.createElement("aside");
  sentencePanel.className = "contextglide-panel";
  sentencePanel.hidden = true;

  const header = document.createElement("div");
  header.className = "contextglide-panel-header";

  const title = document.createElement("strong");
  title.textContent = "Sentence";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "x";
  close.setAttribute("aria-label", "Close ContextGlide sentence panel");
  close.addEventListener("click", closeSentencePanel);

  sentenceSource = document.createElement("p");
  sentenceSource.className = "contextglide-panel-source";

  sentenceResult = document.createElement("p");
  sentenceResult.className = "contextglide-panel-result";

  sentenceFollowupThread = document.createElement("div");
  sentenceFollowupThread.className = "contextglide-followups";

  sentenceFollowupForm = document.createElement("form");
  sentenceFollowupForm.className = "contextglide-followup-form";
  sentenceFollowupInput = document.createElement("input");
  sentenceFollowupInput.type = "text";
  sentenceFollowupInput.placeholder = "Ask about this sentence...";
  const askButton = document.createElement("button");
  askButton.type = "submit";
  askButton.textContent = "Ask";
  sentenceFollowupForm.append(sentenceFollowupInput, askButton);
  sentenceFollowupForm.addEventListener("submit", askSentenceFollowup);

  header.append(title, close);
  sentencePanel.append(header, sentenceSource, sentenceResult, sentenceFollowupThread, sentenceFollowupForm);
  document.documentElement.append(sentencePanel);
}

function closeSentencePanel() {
  if (sentencePanel) {
    sentencePanel.hidden = true;
  }
}

async function askSentenceFollowup(event) {
  event.preventDefault();
  const question = sentenceFollowupInput.value.trim();
  if (!question || !activeSentenceState) {
    return;
  }

  appendFollowup("You", question);
  sentenceFollowupInput.value = "";
  const pending = appendFollowup("ContextGlide", "Thinking...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ask-sentence-followup",
      question,
      sentence: activeSentenceState.sentence,
      translation: activeSentenceState.translation,
      context: activeSentenceState.context,
      token: activeSentenceState.token
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Follow-up failed.");
    }

    renderMarkdown(pending.querySelector(".contextglide-followup-text"), response.answer);
  } catch (error) {
    renderMarkdown(pending.querySelector(".contextglide-followup-text"), error.message);
  }
}

function appendFollowup(role, text) {
  const item = document.createElement("div");
  item.className = "contextglide-followup";
  const name = document.createElement("strong");
  name.className = "contextglide-followup-role";
  name.textContent = role;
  const body = document.createElement("div");
  body.className = "contextglide-followup-text";
  renderMarkdown(body, text);
  item.append(name, body);
  sentenceFollowupThread.append(item);
  sentenceFollowupThread.scrollTop = sentenceFollowupThread.scrollHeight;
  return item;
}

function renderMarkdown(target, rawText) {
  const text = String(rawText || "");
  const fragment = document.createDocumentFragment();
  const lines = text.split(/\r?\n/);
  let list = null;

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      if (!list || list.tagName !== (bullet ? "UL" : "OL")) {
        list = document.createElement(bullet ? "ul" : "ol");
        fragment.append(list);
      }
      const item = document.createElement("li");
      appendInlineMarkdown(item, bullet?.[1] || ordered?.[1] || "");
      list.append(item);
      continue;
    }

    list = null;
    appendInlineMarkdown(fragment, line);
    fragment.append(document.createElement("br"));
  }

  const last = fragment.lastChild;
  if (last?.nodeName === "BR") {
    fragment.removeChild(last);
  }
  target.replaceChildren(fragment);
}

function appendInlineMarkdown(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.append(strong);
    }

    cursor = match.index + token.length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function positionPanelNearFloat() {
  if (!sentencePanel || sentencePanel.hidden || !floatingButton) {
    return;
  }

  const rect = floatingButton.getBoundingClientRect();
  const panelHeight = Math.min(sentencePanel.offsetHeight || 420, Math.max(160, window.innerHeight - 40));
  const top = clamp(rect.bottom + 10, 12, Math.max(12, window.innerHeight - panelHeight - 12));
  sentencePanel.style.top = `${top}px`;
  sentencePanel.style.right = "12px";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
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
