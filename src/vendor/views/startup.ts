import type {
  DomParent,
  TransitionFlag,
  ComponentOptions,
} from "../runtime-types.js";
import type { IconProps } from "../view-types.js";
import {
  SvelteComponent,
  appendStyles,
  attr,
  createSvelteCustomElement,
  detach,
  element,
  initComponent,
  insert,
  noop,
  safeNotEqual,
} from "../runtime.js";
import { startupCss } from "./styles.js";
import { startupArtwork } from "./artwork.js";
function startupStyles(root: DomParent) {
  appendStyles(root, "svelte-5htek5", startupCss);
}
function renderStartup(context: []) {
  let loadingScreen: HTMLDivElement;
  return {
    create() {
      loadingScreen = element("div");
      loadingScreen.innerHTML = startupArtwork;
      attr(loadingScreen, "class", "loading-screen svelte-5htek5");
      attr(loadingScreen, "data-testid", "ipod-loading-screen");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, loadingScreen, anchor);
    },
    update: noop,
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(loadingScreen);
      }
    },
  };
}
class StartupScreen extends SvelteComponent<[], IconProps> {
  constructor(options: ComponentOptions<IconProps>) {
    super();
    initComponent(
      this,
      options,
      null,
      renderStartup,
      safeNotEqual,
      {},
      startupStyles,
    );
  }
}
createSvelteCustomElement(StartupScreen, {}, [], [], true);
export { StartupScreen };
