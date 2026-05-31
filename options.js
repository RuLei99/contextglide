const PROVIDER_DEFAULT_MODELS = {
  deepseek: "deepseek-v4-flash",
  openai: "gpt-5.5-nano",
  gemini: "gemini-3.5-flash",
  claude: "claude-haiku-4.5",
  zhipu: "glm-4.7-flash",
  qwen: "qwen3-turbo",
  customOpenAI: "",
  googleTranslate: "",
  microsoftTranslator: "",
  youdao: ""
};

const PROVIDER_MODELS = {
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  openai: ["gpt-5.5-nano", "gpt-5.4-nano", "gpt-5.5"],
  gemini: ["gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.5-flash"],
  claude: ["claude-haiku-4.5", "claude-opus-4.8", "claude-3-5-haiku-latest"],
  zhipu: ["glm-4.7-flash", "glm-5.1", "glm-4.5-flash", "glm-4-flash"],
  qwen: ["qwen3-turbo", "qwen3-plus", "qwen3-max"],
  customOpenAI: ["gpt-4o-mini", "deepseek-v4-flash", "qwen3-turbo"],
  googleTranslate: [],
  microsoftTranslator: [],
  youdao: []
};

const AUTO_PROVIDERS = new Set([
  "deepseek",
  "openai",
  "gemini",
  "claude",
  "zhipu",
  "qwen",
  "googleTranslate",
  "microsoftTranslator",
  "youdao"
]);

const CUSTOM_ENDPOINT_PROVIDERS = new Set(["customOpenAI"]);
const MODEL_PROVIDERS = new Set(["deepseek", "openai", "gemini", "claude", "zhipu", "qwen", "customOpenAI"]);
const REGION_PROVIDERS = new Set(["microsoftTranslator"]);
const YOUDAO_PROVIDERS = new Set(["youdao"]);

const LANGUAGES = [
  "Simplified Chinese",
  "Traditional Chinese",
  "English",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Spanish",
  "Portuguese",
  "Italian",
  "Russian",
  "Arabic",
  "Vietnamese",
  "Thai",
  "Hindi",
  "Indonesian",
  "Malay",
  "Turkish",
  "Dutch",
  "Polish",
  "Ukrainian",
  "Swedish",
  "Norwegian",
  "Danish"
];

const SOURCE_LANGUAGES = ["auto", ...LANGUAGES];
const REGIONS = ["global", "eastasia", "southeastasia", "eastus", "westus", "westeurope", "northeurope"];

const I18N = {
  en: {
    productType: "Browser reading assistant",
    slogan: "Make AI-assisted reading simple again.",
    readingTitle: "Reading",
    displayLanguage: "Display Language",
    nativeLanguage: "Native Language",
    sourceLanguage: "Source Language",
    targetLanguage: "Translation Target",
    providerTitle: "Provider",
    provider: "Provider",
    apiKey: "Provider API Key",
    customEndpoint: "Custom Endpoint",
    model: "Model",
    region: "Region",
    shortcutTitle: "Shortcut",
    toggleShortcut: "Toggle Shortcut",
    fallbackTitle: "Fallback",
    youdaoKey: "Youdao App Key",
    youdaoSecret: "Youdao App Secret",
    save: "Save",
    saved: "Saved. Refresh the reading page to apply all changes."
  },
  "zh-CN": {
    productType: "\u6d4f\u89c8\u5668\u9605\u8bfb\u52a9\u624b",
    slogan: "\u8ba9 AI \u5feb\u901f\u8f85\u52a9\u9605\u8bfb\u56de\u5f52\u7b80\u5355\u3002",
    readingTitle: "\u9605\u8bfb\u8bbe\u7f6e",
    displayLanguage: "\u754c\u9762\u8bed\u8a00",
    nativeLanguage: "\u6bcd\u8bed",
    sourceLanguage: "\u539f\u6587\u8bed\u8a00",
    targetLanguage: "\u7ffb\u8bd1\u76ee\u6807\u8bed\u8a00",
    providerTitle: "\u670d\u52a1\u5546",
    provider: "\u670d\u52a1\u5546",
    apiKey: "\u670d\u52a1\u5546 API Key",
    customEndpoint: "\u81ea\u5b9a\u4e49\u63a5\u53e3\u5730\u5740",
    model: "\u6a21\u578b",
    region: "\u533a\u57df",
    shortcutTitle: "\u5feb\u6377\u952e",
    toggleShortcut: "\u5f00\u5173\u5feb\u6377\u952e",
    fallbackTitle: "\u5907\u7528\u7ffb\u8bd1",
    youdaoKey: "\u6709\u9053 App Key",
    youdaoSecret: "\u6709\u9053 App Secret",
    save: "\u4fdd\u5b58",
    saved: "\u5df2\u4fdd\u5b58\u3002\u5237\u65b0\u9605\u8bfb\u9875\u9762\u540e\u5b8c\u5168\u751f\u6548\u3002"
  },
  ja: {
    productType: "\u30d6\u30e9\u30a6\u30b6\u8aad\u89e3\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8",
    slogan: "AI \u8aad\u89e3\u652f\u63f4\u3092\u3001\u3082\u3046\u4e00\u5ea6\u30b7\u30f3\u30d7\u30eb\u306b\u3002",
    readingTitle: "\u8aad\u89e3\u8a2d\u5b9a",
    displayLanguage: "\u8868\u793a\u8a00\u8a9e",
    nativeLanguage: "\u6bcd\u8a9e",
    sourceLanguage: "\u539f\u6587\u8a00\u8a9e",
    targetLanguage: "\u7ffb\u8a33\u5148\u8a00\u8a9e",
    providerTitle: "\u30d7\u30ed\u30d0\u30a4\u30c0\u30fc",
    provider: "\u30d7\u30ed\u30d0\u30a4\u30c0\u30fc",
    apiKey: "API \u30ad\u30fc",
    customEndpoint: "\u30ab\u30b9\u30bf\u30e0\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8",
    model: "\u30e2\u30c7\u30eb",
    region: "\u30ea\u30fc\u30b8\u30e7\u30f3",
    shortcutTitle: "\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8",
    toggleShortcut: "\u5207\u308a\u66ff\u3048\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8",
    fallbackTitle: "\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af",
    youdaoKey: "Youdao App Key",
    youdaoSecret: "Youdao App Secret",
    save: "\u4fdd\u5b58",
    saved: "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u8aad\u89e3\u30da\u30fc\u30b8\u3092\u66f4\u65b0\u3059\u308b\u3068\u53cd\u6620\u3055\u308c\u307e\u3059\u3002"
  },
  ko: {
    productType: "\ube0c\ub77c\uc6b0\uc800 \uc77d\uae30 \ub3c4\uc6b0\ubbf8",
    slogan: "AI \uc77d\uae30 \ubcf4\uc870\ub97c \ub2e4\uc2dc \ub2e8\uc21c\ud558\uac8c.",
    readingTitle: "\uc77d\uae30 \uc124\uc815",
    displayLanguage: "\ud45c\uc2dc \uc5b8\uc5b4",
    nativeLanguage: "\ubaa8\uad6d\uc5b4",
    sourceLanguage: "\uc6d0\ubb38 \uc5b8\uc5b4",
    targetLanguage: "\ubc88\uc5ed \ub300\uc0c1 \uc5b8\uc5b4",
    providerTitle: "\uc81c\uacf5\uc790",
    provider: "\uc81c\uacf5\uc790",
    apiKey: "API \ud0a4",
    customEndpoint: "\uc0ac\uc6a9\uc790 \uc9c0\uc815 \uc5d4\ub4dc\ud3ec\uc778\ud2b8",
    model: "\ubaa8\ub378",
    region: "\uc9c0\uc5ed",
    shortcutTitle: "\ub2e8\ucd95\ud0a4",
    toggleShortcut: "\ud1a0\uae00 \ub2e8\ucd95\ud0a4",
    fallbackTitle: "\ub300\uccb4 \ubc88\uc5ed",
    youdaoKey: "Youdao App Key",
    youdaoSecret: "Youdao App Secret",
    save: "\uc800\uc7a5",
    saved: "\uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc77d\uae30 \ud398\uc774\uc9c0\ub97c \uc0c8\ub85c\uace0\uce68\ud558\uba74 \uc801\uc6a9\ub429\ub2c8\ub2e4."
  }
};

const form = document.querySelector("#form");
const displayLanguage = document.querySelector("#displayLanguage");
const nativeLanguage = document.querySelector("#nativeLanguage");
const aiProvider = document.querySelector("#aiProvider");
const customProviderEndpoint = document.querySelector("#customProviderEndpoint");
const aiApiKey = document.querySelector("#aiApiKey");
const aiModel = document.querySelector("#aiModel");
const modelOptions = document.querySelector("#modelOptions");
const providerRegion = document.querySelector("#providerRegion");
const sourceLanguage = document.querySelector("#sourceLanguage");
const targetLanguage = document.querySelector("#targetLanguage");
const contextGlideShortcut = document.querySelector("#contextGlideShortcut");
const appKey = document.querySelector("#appKey");
const appSecret = document.querySelector("#appSecret");
const status = document.querySelector("#status");
const languageOptions = document.querySelector("#languageOptions");
const sourceLanguageOptions = document.querySelector("#sourceLanguageOptions");
const regionOptions = document.querySelector("#regionOptions");

let currentLocale = resolveBrowserLocale();

fillDatalist(languageOptions, LANGUAGES);
fillDatalist(sourceLanguageOptions, SOURCE_LANGUAGES);
fillDatalist(regionOptions, REGIONS);

chrome.storage.sync.get({
  displayLanguage: "auto",
  nativeLanguage: "",
  aiProvider: "deepseek",
  aiApiKey: "",
  aiModel: "",
  customProviderEndpoint: "",
  providerRegion: "",
  contextGlideShortcut: defaultShortcut(),
  sourceLanguage: "auto",
  targetLanguage: "",
  youdaoAppKey: "",
  youdaoAppSecret: "",
  deepseekApiKey: "",
  deepseekModel: ""
}, (settings) => {
  const inferredNativeLanguage = settings.nativeLanguage || languageFromLocale(navigator.language);
  displayLanguage.value = settings.displayLanguage || "auto";
  nativeLanguage.value = inferredNativeLanguage;
  aiProvider.value = settings.aiProvider || "deepseek";
  customProviderEndpoint.value = settings.customProviderEndpoint || "";
  aiApiKey.value = settings.aiApiKey || settings.deepseekApiKey || "";
  aiModel.value = settings.aiModel || settings.deepseekModel || PROVIDER_DEFAULT_MODELS[aiProvider.value] || "";
  providerRegion.value = settings.providerRegion || "";
  sourceLanguage.value = settings.sourceLanguage || "auto";
  targetLanguage.value = settings.targetLanguage || inferredNativeLanguage;
  appKey.value = settings.youdaoAppKey || "";
  appSecret.value = settings.youdaoAppSecret || "";
  contextGlideShortcut.value = settings.contextGlideShortcut || defaultShortcut();
  currentLocale = displayLanguage.value === "auto" ? resolveBrowserLocale() : displayLanguage.value;
  applyLocale(currentLocale);
  syncProviderFields(true);
});

displayLanguage.addEventListener("change", () => {
  currentLocale = displayLanguage.value === "auto" ? resolveBrowserLocale() : displayLanguage.value;
  applyLocale(currentLocale);
});

nativeLanguage.addEventListener("change", () => {
  if (!targetLanguage.value || LANGUAGES.includes(targetLanguage.value)) {
    targetLanguage.value = nativeLanguage.value;
  }
});

aiProvider.addEventListener("change", () => {
  syncProviderFields(false);
});

contextGlideShortcut.addEventListener("keydown", (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Backspace" || event.key === "Delete") {
    contextGlideShortcut.value = "";
    return;
  }

  const shortcut = shortcutFromEvent(event);
  if (shortcut) {
    contextGlideShortcut.value = shortcut;
  }
});

contextGlideShortcut.addEventListener("focus", () => {
  contextGlideShortcut.select();
});

function syncProviderFields(keepExistingModel) {
  const provider = aiProvider.value;
  fillDatalist(modelOptions, PROVIDER_MODELS[provider] || []);

  customProviderEndpoint.closest("label").hidden = !CUSTOM_ENDPOINT_PROVIDERS.has(provider);
  aiModel.closest("label").hidden = !MODEL_PROVIDERS.has(provider);
  providerRegion.closest("label").hidden = !REGION_PROVIDERS.has(provider);
  appKey.closest("label").hidden = !YOUDAO_PROVIDERS.has(provider);
  appSecret.closest("label").hidden = !YOUDAO_PROVIDERS.has(provider);
  aiApiKey.closest("label").hidden = provider === "youdao";

  if (!keepExistingModel || !aiModel.value) {
    aiModel.value = PROVIDER_DEFAULT_MODELS[provider] || "";
  }

  if (AUTO_PROVIDERS.has(provider)) {
    customProviderEndpoint.value = "";
  }
}

function fillDatalist(datalist, values) {
  datalist.replaceChildren(
    ...values.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      return option;
    })
  );
}

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}

function shortcutFromEvent(event) {
  const key = normalizeShortcutKey(event.key);
  if (!key || ["Control", "Shift", "Alt", "Meta", "Command"].includes(key)) {
    return "";
  }

  const parts = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.metaKey) {
    parts.push("Command");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  parts.push(key);
  return parts.join("+");
}

function normalizeShortcutKey(key) {
  if (!key) {
    return "";
  }
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

function applyLocale(locale) {
  const dict = I18N[locale] || I18N.en;
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dict[key]) {
      node.textContent = dict[key];
    }
  });
}

function resolveBrowserLocale() {
  const language = navigator.language || "en";
  if (language.startsWith("zh")) {
    return "zh-CN";
  }
  if (language.startsWith("ja")) {
    return "ja";
  }
  if (language.startsWith("ko")) {
    return "ko";
  }
  return "en";
}

function languageFromLocale(locale) {
  const language = String(locale || "").toLowerCase();
  if (language.startsWith("zh")) {
    return "Simplified Chinese";
  }
  if (language.startsWith("ja")) {
    return "Japanese";
  }
  if (language.startsWith("ko")) {
    return "Korean";
  }
  if (language.startsWith("de")) {
    return "German";
  }
  if (language.startsWith("fr")) {
    return "French";
  }
  if (language.startsWith("es")) {
    return "Spanish";
  }
  return "English";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.sync.set({
    displayLanguage: displayLanguage.value,
    nativeLanguage: nativeLanguage.value.trim() || languageFromLocale(navigator.language),
    aiProvider: aiProvider.value,
    customProviderEndpoint: customProviderEndpoint.value.trim(),
    aiApiKey: aiApiKey.value.trim(),
    aiModel: aiModel.value.trim() || PROVIDER_DEFAULT_MODELS[aiProvider.value] || "",
    providerRegion: providerRegion.value.trim(),
    sourceLanguage: sourceLanguage.value.trim() || "auto",
    targetLanguage: targetLanguage.value.trim() || nativeLanguage.value.trim() || languageFromLocale(navigator.language),
    contextGlideShortcut: contextGlideShortcut.value.trim() || defaultShortcut(),
    youdaoAppKey: appKey.value.trim(),
    youdaoAppSecret: appSecret.value.trim()
  });
  status.textContent = (I18N[currentLocale] || I18N.en).saved;
});
