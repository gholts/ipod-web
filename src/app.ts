import type { IPodElement, Storefront } from "./types.js";

const buttons = document.querySelectorAll<HTMLButtonElement>("[data-region]");
const simulator = document.getElementById("simulator")!;
const error = document.getElementById("error")!;

function showError(message: string, cause: unknown): void {
  error.textContent = message;
  error.hidden = false;
  console.error(cause);
}

try {
  const [{ resetOfflineScreen }, { japaneseStrings }] = await Promise.all([
    import("./vendor/ipod.js"),
    import("./data.js"),
  ]);

  function showRegion(storefront: Storefront): void {
    resetOfflineScreen();
    const language = storefront === "jp" ? "ja" : "en-US";
    document.documentElement.lang = language;
    const ipod = document.createElement("web-music-ipod") as IPodElement;
    ipod.locale = { storefront, language };
    if (storefront === "jp") {
      ipod.i18n = {
        t(key, values = {}) {
          return japaneseStrings[key]?.replace(
            /@@(\w+)@@/g,
            (token: string, name: string) =>
              name in values ? String(values[name]) : token,
          );
        },
      };
    }
    // Remount to stop the previous player and clear its catalog/menu state.
    simulator.replaceChildren(ipod);
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.region === storefront),
      );
    }
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") !== "true")
        showRegion(button.dataset.region as Storefront);
    });
  }
  showRegion("us");
} catch (cause) {
  showError("Unable to load iPod. Reload when connected.", cause);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("./sw.js", import.meta.url))
    .catch((cause) => {
      showError("Offline cache unavailable.", cause);
    });
}
