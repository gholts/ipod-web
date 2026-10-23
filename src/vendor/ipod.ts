// Apple browser iPod. Public custom-element entry point; source notes: ../../README.md.
import { playbackAllowed } from "./playback.js";
import { baseStyles, registerFonts } from "./environment.js";
import { IPodComponent } from "./views/device.js";
const IPodElement =
  IPodComponent.element as new () => import("../types.js").IPodElement;
registerFonts();
class WebMusicIPod extends IPodElement {
  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = baseStyles;
    this.shadowRoot?.prepend(style);
  }
}
customElements.define("web-music-ipod", WebMusicIPod);

// Local adapter: a new region starts in its menu, even after a playback error.
export function resetOfflineScreen() {
  playbackAllowed.set(true);
}
