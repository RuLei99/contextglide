# ContextGlide

ContextGlide is a lightweight Chrome extension for multilingual reading. It keeps you on the original page, places a quiet translation line under each word or short phrase, and lets an AI or translation provider return the meaning that fits the nearby context.

Chinese summary: ContextGlide makes fast AI-assisted reading simple again. It does not try to become a heavy reading platform with sidebars, note systems, dashboards, or complex workflows. Stay in the original text, click only when you need help, and let the model explain the word in your native language.

Japanese summary: ContextGlide is a lightweight reading helper that keeps the original page flow and shows contextual meanings for clicked words or short phrases.

Korean summary: ContextGlide is a lightweight reading helper that keeps the original page flow and shows contextual meanings for clicked words or short phrases.

## Why ContextGlide

Many translation tools become complex reading systems: sidebars, dashboards, note databases, learning queues, and heavy workflows. ContextGlide takes the opposite path.

The goal is simple: make AI-assisted reading feel fast, calm, and close to the original text.

Our differentiation is not more buttons. It is less interruption:

- Stay on the original page.
- Click only when you need help.
- Use context, not isolated dictionary lookup.
- Show the answer inline, under the source text.
- Keep provider and target language choices flexible.

## Features

- Multilingual token support with `Intl.Segmenter`, plus a Unicode regex fallback.
- Context-aware lookup: sends the clicked token and nearby paragraph text to the selected provider.
- AI providers: DeepSeek, OpenAI, Gemini, Claude, Zhipu AI, Qwen, and any custom OpenAI-compatible provider.
- Translation providers: Google Translate, Microsoft Translator, and Youdao.
- Common providers are preconfigured; users only need to choose a provider, choose a model, and paste a token or API key.
- Custom providers expose an endpoint field for less common OpenAI-compatible APIs.
- Native language and target language use selectable suggestions, while still allowing custom text.
- Quiet default behavior: ContextGlide only shows a tiny right-side floating button until the user turns on Word or Sentence mode.
- Draggable right-edge control: move the floating button up or down while it stays attached to the page edge.
- On-demand requests: blank translation slots appear first; API calls happen only after a click.
- Sentence follow-up chat: after translating a sentence, ask short questions about grammar, meaning, tone, or usage in the same panel.
- Follow-up answers support lightweight Markdown display for bold text, inline code, line breaks, and simple lists.
- Local cache for the same provider, endpoint, model, target language, token, and context for 30 days.
- Runs on ordinary `http://*/*` and `https://*/*` pages.

## Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this project folder.
5. Make sure `ContextGlide` is enabled.

## Configuration

Click the extension icon and open `AI/API Settings`.

Recommended AI configuration:

```text
Display Language: Auto | English | Chinese | Japanese | Korean
Native Language: <YOUR_NATIVE_LANGUAGE>
Provider: DeepSeek | OpenAI | Gemini | Claude | Zhipu AI | Qwen
Provider API Key: <YOUR_PROVIDER_API_KEY>
Model: <SELECTED_MODEL>
Source Language: auto
Target Language: <YOUR_NATIVE_LANGUAGE>
```

For built-in AI providers, ContextGlide already knows the API endpoint. The user should not need to paste an endpoint. They only choose the provider/model and paste the token or API key.

Custom OpenAI-compatible provider:

```text
Provider: Custom OpenAI-compatible
Custom Endpoint: <YOUR_OPENAI_COMPATIBLE_BASE_URL_OR_CHAT_COMPLETIONS_URL>
Provider API Key: <YOUR_PROVIDER_API_KEY>
Model: <YOUR_MODEL_ID>
```

Traditional translation configuration:

```text
Provider: Google Translate | Microsoft Translator | Youdao only
Provider API Key: <YOUR_TRANSLATION_PROVIDER_KEY>
Microsoft Region: <YOUR_MICROSOFT_TRANSLATOR_REGION>
Youdao App Key: <YOUR_YOUDAO_APP_KEY>
Youdao App Secret: <YOUR_YOUDAO_APP_SECRET>
```

Do not commit real API keys or secrets to GitHub.

The settings page follows the browser language by default and can be switched manually. The first-run native language is inferred from the browser locale, and the translation target defaults to that native language. Language, model, and region fields provide suggestions while still allowing custom values.

## Suggested Models

The model list is configurable. The built-in options are recommendations, not hard limits. If a provider changes its official model ID, type the exact model name from that provider's console or documentation.

| Provider | Suggested fast model | Suggested strong model | Notes |
| --- | --- | --- | --- |
| DeepSeek | `deepseek-v4-flash` | `deepseek-v4-pro` | Flash focuses on low-cost, high-frequency reading tasks; Pro is better for stronger contextual reasoning. |
| OpenAI | `gpt-5.5-nano` / `gpt-5.4-nano` | `gpt-5.5` | Nano-style models are best for quick lookup, extraction, and short reading assistance. |
| Google Gemini | `gemini-3.5-flash` | `gemini-3.5-pro` | Flash-style models are good for low-latency interaction. |
| Anthropic Claude | `claude-haiku-4.5` | `claude-opus-4.8` | Haiku-style models are a good fit for frequent lightweight calls. |
| Zhipu AI | `glm-4.7-flash` | `glm-5.1` | Flash models are recommended for cost-sensitive reading assistance. |
| Alibaba Qwen | `qwen3-turbo` | `qwen3-plus` / `qwen3-max` | Qwen support uses DashScope OpenAI-compatible mode. |

## Usage

Open any reading page. ContextGlide is off by default and only shows a tiny floating button on the right side. Click the floating button, popup mode button, or browser shortcut to cycle:

```text
Off -> Word -> Sentence -> Off
```

In Word mode, words or short phrases receive a blank line underneath. Click any token, and ContextGlide sends the token plus nearby context to the selected provider, then displays the returned target-language meaning under the original text.

In Sentence mode, you still click a word. ContextGlide finds the nearest sentence containing that word, sends the sentence plus paragraph context to the provider, and shows the translated sentence in the right-side panel.

After a sentence translation appears, you can ask follow-up questions in the same panel. For example, ask why a phrase is translated that way, what a grammar structure means, or how the sentence sounds in context. Follow-up questions require an AI provider such as DeepSeek, OpenAI, Gemini, Claude, Zhipu AI, Qwen, or a custom OpenAI-compatible provider.

## Toggle and Shortcut

ContextGlide is designed to stay out of your way. It starts in Off mode on every page. The only default UI is a small floating button. Turn on Word mode or Sentence mode from that button, from the popup, or with the browser shortcut. When returning to Off, ContextGlide restores the page text and closes the sentence panel.

The floating button can be dragged vertically. It remains attached to the right edge so it does not cover the reading area more than necessary.

Default shortcut:

```text
Windows / Linux: Ctrl + Shift + Y
macOS: Command + Shift + Y
```

You can change the browser-level shortcut in Chrome:

```text
chrome://extensions/shortcuts
```

You can also record a page-level shortcut in ContextGlide settings. Click the shortcut field, press the key combination you want, then save. This cycles the same modes as the floating button.

## Prompt Design

ContextGlide does not send an isolated word alone. It captures the nearest paragraph-like container, removes already displayed inline translations, normalizes whitespace, and sends up to about 1,000 characters of nearby context.

Sentence mode uses the clicked word as an anchor. ContextGlide extracts the sentence containing that word with English and CJK punctuation boundaries, then asks the provider for a target-language sentence translation.

System prompt:

```text
You are a multilingual contextual reading assistant.
Infer the meaning of the target word or short phrase from the provided sentence or paragraph context.
Return only the best translation or meaning in <TARGET_LANGUAGE>.
Do not explain, do not include pronunciation, and do not include examples.
Prefer a concise answer suitable for displaying beneath the original text.
If the target is a proper noun, return its common localized name when available; otherwise return 'proper noun' in the target language.
```

User prompt:

```text
Source language: <SOURCE_LANGUAGE>
Target language: <TARGET_LANGUAGE>
Target text: <TOKEN>

Context:
<THE_PARAGRAPH_OR_NEARBY_TEXT>

Question: In this context, what is the most accurate target-language meaning of the target text?
```

## Provider Notes

- DeepSeek, OpenAI, Zhipu AI, and Qwen use OpenAI-compatible `chat/completions`.
- Custom OpenAI-compatible providers can use either a base URL or a full `/chat/completions` URL.
- Claude uses Anthropic Messages API.
- Gemini uses Google Gemini `generateContent`.
- Google Translate uses Google Cloud Translation Basic v2.
- Microsoft Translator uses Azure AI Translator Text API v3.
- Youdao uses its signed translation API and is best as a dictionary-style fallback.
- Client-side browser extensions are convenient for personal use. Public products should prefer a backend proxy so provider secrets are not exposed to users.

## Security Checklist Before Publishing

Run a sensitive string scan before pushing:

```powershell
rg -n "sk-|Bearer [A-Za-z0-9]|api[_-]?key|secret" .
```

Expected matches should be documentation placeholders or code variable names only.

Check that:

- No real `sk-...`, `Bearer ...`, API key, secret, or token is committed.
- README examples use placeholders like `<YOUR_PROVIDER_API_KEY>`.
- Any key that appeared in chat, screenshots, commits, or public pages has been reset.
- You understand that client-side extensions are suitable for personal use, while public products should use a backend proxy.

## Development Notes

- `manifest.json`: Chrome Manifest V3 configuration, permissions, and content script entry.
- `content.js`: multilingual tokenization, inline translation slots, and context capture.
- `background.js`: provider routing, API requests, prompt building, and local cache.
- `options.html` / `options.js`: provider, model, language, and key configuration.
- `popup.html` / `popup.js`: quick enable switch and settings entry.
