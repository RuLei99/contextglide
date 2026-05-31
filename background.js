const YOUDAO_ENDPOINT = "https://openapi.youdao.com/api";
const CACHE_PREFIX = "contextglide:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PROVIDERS = {
  deepseek: {
    label: "DeepSeek",
    defaultModel: "deepseek-v4-flash",
    endpoint: "https://api.deepseek.com/chat/completions",
    type: "openai-compatible"
  },
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-5.5-nano",
    endpoint: "https://api.openai.com/v1/chat/completions",
    type: "openai-compatible"
  },
  gemini: {
    label: "Gemini",
    defaultModel: "gemini-3.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    type: "gemini"
  },
  claude: {
    label: "Claude",
    defaultModel: "claude-haiku-4.5",
    endpoint: "https://api.anthropic.com/v1/messages",
    type: "anthropic"
  },
  zhipu: {
    label: "Zhipu AI",
    defaultModel: "glm-4.7-flash",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    type: "openai-compatible"
  },
  qwen: {
    label: "Qwen",
    defaultModel: "qwen3-turbo",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    type: "openai-compatible"
  },
  customOpenAI: {
    label: "Custom OpenAI-compatible",
    defaultModel: "",
    endpoint: "",
    type: "openai-compatible"
  },
  googleTranslate: {
    label: "Google Translate",
    endpoint: "https://translation.googleapis.com/language/translate/v2",
    type: "google-translate"
  },
  microsoftTranslator: {
    label: "Microsoft Translator",
    endpoint: "https://api.cognitive.microsofttranslator.com/translate",
    type: "microsoft-translator"
  },
  youdao: {
    label: "Youdao",
    type: "youdao"
  }
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-contextglide") {
    await toggleContextGlide();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "translate-token") {
    translateToken(message.token, message.context)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "translate-word") {
    translateToken(message.word, message.context)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

async function toggleContextGlide() {
  const settings = await chrome.storage.sync.get({
    contextGlideEnabled: false
  });
  await chrome.storage.sync.set({
    contextGlideEnabled: !settings.contextGlideEnabled
  });
}

async function translateToken(rawToken, rawContext) {
  const token = normalizeToken(rawToken);
  const context = normalizeContext(rawContext);
  if (!token) {
    throw new Error("No text selected.");
  }

  const settings = await getSettings();
  const cacheHash = await sha256Hex([
    settings.provider,
    settings.customProviderEndpoint,
    settings.model,
    settings.targetLanguage,
    token,
    context
  ].join("\n").toLowerCase());
  const cacheKey = `${CACHE_PREFIX}${cacheHash.slice(0, 32)}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const hit = cached[cacheKey];
  if (hit && Date.now() - hit.savedAt < CACHE_TTL_MS) {
    return hit.text;
  }

  const translation = await translateWithProvider(token, context, settings);
  await chrome.storage.local.set({
    [cacheKey]: {
      text: translation,
      savedAt: Date.now()
    }
  });

  return translation;
}

async function getSettings() {
  const settings = await chrome.storage.sync.get({
    contextGlideEnabled: undefined,
    aiProvider: "deepseek",
    aiApiKey: "",
    aiModel: "",
    customProviderEndpoint: "",
    providerRegion: "",
    targetLanguage: "Simplified Chinese",
    sourceLanguage: "auto",
    youdaoAppKey: "",
    youdaoAppSecret: "",
    deepseekApiKey: "",
    deepseekModel: ""
  });

  const provider = settings.aiProvider || "deepseek";
  const providerDef = { ...(PROVIDERS[provider] || PROVIDERS.deepseek) };
  if (provider === "customOpenAI") {
    providerDef.endpoint = normalizeEndpoint(settings.customProviderEndpoint);
  }

  return {
    provider,
    providerDef,
    apiKey: settings.aiApiKey || settings.deepseekApiKey || "",
    model: settings.aiModel || settings.deepseekModel || providerDef.defaultModel || "",
    customProviderEndpoint: settings.customProviderEndpoint || "",
    region: settings.providerRegion || "",
    targetLanguage: settings.targetLanguage || "Simplified Chinese",
    sourceLanguage: settings.sourceLanguage || "auto",
    youdaoAppKey: settings.youdaoAppKey || "",
    youdaoAppSecret: settings.youdaoAppSecret || ""
  };
}

async function translateWithProvider(token, context, settings) {
  const provider = settings.providerDef;

  if (provider.type === "youdao") {
    return translateWithYoudao(token, settings);
  }

  if (provider.type === "google-translate") {
    return translateWithGoogleTranslate(token, settings, provider);
  }

  if (provider.type === "microsoft-translator") {
    return translateWithMicrosoftTranslator(token, settings, provider);
  }

  if (!settings.apiKey) {
    throw new Error("Please set a provider API key in extension options.");
  }

  if (provider.type === "anthropic") {
    return translateWithClaude(token, context, settings, provider);
  }

  if (provider.type === "gemini") {
    return translateWithGemini(token, context, settings, provider);
  }

  return translateWithOpenAICompatible(token, context, settings, provider);
}

async function translateWithOpenAICompatible(token, context, settings, provider) {
  if (!provider.endpoint) {
    throw new Error("Please set a custom OpenAI-compatible endpoint in extension options.");
  }

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || provider.defaultModel,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(settings)
        },
        {
          role: "user",
          content: buildUserPrompt(token, context, settings)
        }
      ],
      temperature: 0.2,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`${provider.label} request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return cleanTranslation(data?.choices?.[0]?.message?.content, settings);
}

function normalizeEndpoint(endpoint) {
  const value = String(endpoint || "").trim();
  if (!value) {
    return "";
  }

  if (/\/chat\/completions\/?$/.test(value)) {
    return value.replace(/\/$/, "");
  }

  return `${value.replace(/\/$/, "")}/chat/completions`;
}

async function translateWithClaude(token, context, settings, provider) {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: settings.model || provider.defaultModel,
      max_tokens: 80,
      temperature: 0.2,
      system: buildSystemPrompt(settings),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(token, context, settings)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`${provider.label} request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.content?.map((part) => part.text || "").join("\n");
  return cleanTranslation(text, settings);
}

async function translateWithGemini(token, context, settings, provider) {
  const model = encodeURIComponent(settings.model || provider.defaultModel);
  const endpoint = `${provider.endpoint}/${model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${buildSystemPrompt(settings)}\n\n${buildUserPrompt(token, context, settings)}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 80
      }
    })
  });

  if (!response.ok) {
    throw new Error(`${provider.label} request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
  return cleanTranslation(text, settings);
}

async function translateWithGoogleTranslate(token, settings, provider) {
  if (!settings.apiKey) {
    throw new Error("Please set a Google Cloud Translation API key in extension options.");
  }

  const body = {
    q: token,
    target: languageCode(settings.targetLanguage, "zh-CN"),
    format: "text"
  };

  const source = languageCode(settings.sourceLanguage, "");
  if (source && source !== "auto") {
    body.source = source;
  }

  const endpoint = `${provider.endpoint}?key=${encodeURIComponent(settings.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${provider.label} request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return decodeHtmlEntities(data?.data?.translations?.[0]?.translatedText) || fallbackText(settings);
}

async function translateWithMicrosoftTranslator(token, settings, provider) {
  if (!settings.apiKey) {
    throw new Error("Please set a Microsoft Translator key in extension options.");
  }

  const params = new URLSearchParams({
    "api-version": "3.0",
    to: languageCode(settings.targetLanguage, "zh-Hans")
  });

  const source = languageCode(settings.sourceLanguage, "");
  if (source && source !== "auto") {
    params.set("from", source);
  }

  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": settings.apiKey
  };

  if (settings.region) {
    headers["Ocp-Apim-Subscription-Region"] = settings.region;
  }

  const response = await fetch(`${provider.endpoint}?${params.toString()}`, {
    method: "POST",
    headers,
    body: JSON.stringify([{ text: token }])
  });

  if (!response.ok) {
    throw new Error(`${provider.label} request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.[0]?.translations?.[0]?.text || fallbackText(settings);
}

async function translateWithYoudao(token, settings) {
  if (!settings.youdaoAppKey || !settings.youdaoAppSecret) {
    throw new Error("Please set Youdao App Key and App Secret in extension options.");
  }

  const salt = crypto.randomUUID();
  const curtime = Math.floor(Date.now() / 1000).toString();
  const signInput = truncateForYoudaoSign(token);
  const signText = `${settings.youdaoAppKey}${signInput}${salt}${curtime}${settings.youdaoAppSecret}`;
  const sign = await sha256Hex(signText);

  const body = new URLSearchParams({
    q: token,
    from: youdaoLanguageCode(settings.sourceLanguage, "auto"),
    to: youdaoLanguageCode(settings.targetLanguage, "zh-CHS"),
    appKey: settings.youdaoAppKey,
    salt,
    sign,
    signType: "v3",
    curtime
  });

  const response = await fetch(YOUDAO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Youdao request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.errorCode && data.errorCode !== "0") {
    throw new Error(`Youdao error ${data.errorCode}`);
  }

  const basicExplains = data?.basic?.explains;
  if (Array.isArray(basicExplains) && basicExplains.length > 0) {
    return basicExplains.slice(0, 3).join("; ");
  }

  const translations = data?.translation;
  if (Array.isArray(translations) && translations.length > 0) {
    return translations.slice(0, 2).join("; ");
  }

  return fallbackText(settings);
}

function buildSystemPrompt(settings) {
  return [
    "You are a multilingual contextual reading assistant.",
    "Infer the meaning of the target word or short phrase from the provided sentence or paragraph context.",
    `Return only the best translation or meaning in ${settings.targetLanguage}.`,
    "Do not explain, do not include pronunciation, and do not include examples.",
    "Prefer a concise answer suitable for displaying beneath the original text.",
    "If the target is a proper noun, return its common localized name when available; otherwise return 'proper noun' in the target language."
  ].join(" ");
}

function buildUserPrompt(token, context, settings) {
  return [
    `Source language: ${settings.sourceLanguage}`,
    `Target language: ${settings.targetLanguage}`,
    `Target text: ${token}`,
    "",
    "Context:",
    context || "(No surrounding context was captured.)",
    "",
    "Question: In this context, what is the most accurate target-language meaning of the target text?"
  ].join("\n");
}

function cleanTranslation(text, settings) {
  const firstLine = String(text || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)[0];

  return firstLine ? firstLine.slice(0, 48) : fallbackText(settings);
}

function normalizeToken(token) {
  return String(token || "")
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
    .trim();
}

function normalizeContext(context) {
  return String(context || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

function truncateForYoudaoSign(input) {
  if (input.length <= 20) {
    return input;
  }

  return `${input.slice(0, 10)}${input.length}${input.slice(-10)}`;
}

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function fallbackText(settings) {
  const language = String(settings?.targetLanguage || "").toLowerCase();
  if (language.includes("japanese") || language.includes("ja")) {
    return "Not found";
  }
  if (language.includes("korean") || language.includes("ko")) {
    return "Not found";
  }
  if (language.includes("chinese") || language.includes("zh")) {
    return "Not found";
  }
  return "Not found";
}

function languageCode(language, fallback) {
  const normalized = String(language || "").toLowerCase();
  const map = [
    [/auto|detect/, "auto"],
    [/english|en\b/, "en"],
    [/simplified chinese|zh-cn|zh-hans|chinese|mandarin/, "zh-CN"],
    [/traditional chinese|zh-tw|zh-hant/, "zh-TW"],
    [/japanese|ja\b/, "ja"],
    [/korean|ko\b/, "ko"],
    [/french|fr\b/, "fr"],
    [/spanish|es\b/, "es"],
    [/russian|ru\b/, "ru"],
    [/german|de\b/, "de"],
    [/italian|it\b/, "it"],
    [/portuguese|pt\b/, "pt"],
    [/vietnamese|vi\b/, "vi"],
    [/thai|th\b/, "th"],
    [/arabic|ar\b/, "ar"]
  ];

  return map.find(([pattern]) => pattern.test(normalized))?.[1] || fallback;
}

function youdaoLanguageCode(language, fallback) {
  const code = languageCode(language, fallback);
  if (code === "zh-CN") {
    return "zh-CHS";
  }
  if (code === "zh-TW") {
    return "zh-CHT";
  }
  return code;
}
