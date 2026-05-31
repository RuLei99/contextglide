const ENABLED_KEY = "contextGlideEnabled";
const SHORTCUT_KEY = "contextGlideShortcut";

const enabled = document.querySelector("#enabled");
const openOptions = document.querySelector("#openOptions");
const status = document.querySelector("#status");

chrome.storage.sync.get({
  [ENABLED_KEY]: false,
  [SHORTCUT_KEY]: defaultShortcut()
}, (settings) => {
  enabled.checked = Boolean(settings[ENABLED_KEY]);
  document.querySelector(".hint").textContent = `Shortcut: ${settings[SHORTCUT_KEY] || defaultShortcut()}`;
});

enabled.addEventListener("change", async () => {
  await chrome.storage.sync.set({ [ENABLED_KEY]: enabled.checked });
  status.textContent = enabled.checked
    ? "Enabled on this page."
    : "Disabled and page text will be restored.";
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}
