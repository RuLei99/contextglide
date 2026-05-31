const SHORTCUT_KEY = "contextGlideShortcut";

const modeButton = document.querySelector("#modeButton");
const openOptions = document.querySelector("#openOptions");
const status = document.querySelector("#status");

chrome.storage.sync.get({
  [SHORTCUT_KEY]: defaultShortcut()
}, (settings) => {
  document.querySelector(".hint").textContent = `Shortcut: ${settings[SHORTCUT_KEY] || defaultShortcut()}`;
});

chrome.runtime.sendMessage({ type: "get-active-tab-state" }, (response) => {
  renderMode(response?.mode || "off");
});

modeButton.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "toggle-active-tab" });
  if (!response?.ok) {
    renderMode("off");
    status.textContent = response?.error || "Cannot run on this page.";
    return;
  }
  renderMode(response.mode || "off");
  status.textContent = modeText(response.mode || "off");
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function renderMode(mode) {
  modeButton.textContent = `Mode: ${modeLabel(mode)}`;
}

function modeLabel(mode) {
  if (mode === "word") {
    return "Word";
  }
  if (mode === "sentence") {
    return "Sentence";
  }
  return "Off";
}

function modeText(mode) {
  if (mode === "word") {
    return "Word mode enabled.";
  }
  if (mode === "sentence") {
    return "Sentence mode enabled.";
  }
  return "Disabled and page text restored.";
}

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}
