const SHORTCUT_KEY = "contextGlideShortcut";

const enabled = document.querySelector("#enabled");
const openOptions = document.querySelector("#openOptions");
const status = document.querySelector("#status");

chrome.storage.sync.get({
  [SHORTCUT_KEY]: defaultShortcut()
}, (settings) => {
  document.querySelector(".hint").textContent = `Shortcut: ${settings[SHORTCUT_KEY] || defaultShortcut()}`;
});

chrome.runtime.sendMessage({ type: "get-active-tab-state" }, (response) => {
  enabled.checked = Boolean(response?.enabled);
});

enabled.addEventListener("change", async () => {
  const response = await chrome.runtime.sendMessage({ type: "toggle-active-tab" });
  if (!response?.ok) {
    enabled.checked = false;
    status.textContent = response?.error || "Cannot run on this page.";
    return;
  }
  enabled.checked = Boolean(response.enabled);
  status.textContent = response.enabled
    ? "Enabled on this page."
    : "Disabled and page text restored.";
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function defaultShortcut() {
  return navigator.platform?.toLowerCase().includes("mac")
    ? "Command+Shift+Y"
    : "Ctrl+Shift+Y";
}
