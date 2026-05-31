const ENABLED_KEY = "contextGlideEnabled";
const SHORTCUT_KEY = "contextGlideShortcut";

const enabled = document.querySelector("#enabled");
const openOptions = document.querySelector("#openOptions");
const status = document.querySelector("#status");

chrome.storage.sync.get({
  [ENABLED_KEY]: true,
  [SHORTCUT_KEY]: defaultShortcut()
}, (settings) => {
  enabled.checked = Boolean(settings[ENABLED_KEY]);
  document.querySelector(".hint").textContent = `Shortcut: ${settings[SHORTCUT_KEY] || defaultShortcut()}`;
});

enabled.addEventListener("change", async () => {
  await chrome.storage.sync.set({ [ENABLED_KEY]: enabled.checked });
  status.textContent = "Refresh the page to fully apply changes.";
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}
