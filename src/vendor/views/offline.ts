import { offlineArtwork } from "./artwork.js";
import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { OfflineProps } from "../view-types.js";
import { OfflineSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  createSvelteCustomElement,
  detach,
  element,
  flush,
  initComponent,
  insert,
  noop,
  safeNotEqual,
  setData,
  setStyle,
  space,
  svgElement,
  text,
} from "../runtime.js";
import { offlineCss } from "./styles.js";
function offlineStyles(root: DomParent) {
  appendStyles(root, "svelte-qjo9zb", offlineCss);
}
function renderOffline(context: ReturnType<typeof offlineMessageInstance>) {
  let ipodOverlayScreen: HTMLDivElement,
    sadIpodContainer: HTMLDivElement,
    sadIpodIcon: SVGSVGElement,
    spacer: Text,
    errorMessage: HTMLParagraphElement,
    textNode: Text;
  return {
    create() {
      ipodOverlayScreen = element("div");
      sadIpodContainer = element("div");
      sadIpodIcon = svgElement("svg");
      sadIpodIcon.innerHTML = offlineArtwork;
      // Use this browser's CSSOM serialization without moving style attributes.
      for (const path of sadIpodIcon.querySelectorAll("path")) {
        path.style.cssText = path.style.cssText;
      }
      spacer = space();
      errorMessage = element("p");
      textNode = text(context[OfflineSlot.message]);
      attr(sadIpodIcon, "class", "sad-ipod-icon svelte-qjo9zb");
      attr(sadIpodIcon, "width", "100");
      attr(sadIpodIcon, "height", "100");
      attr(sadIpodIcon, "xmlns", "http://www.w3.org/2000/svg");
      attr(sadIpodIcon, "xml:space", "preserve");
      setStyle(sadIpodIcon, "fill-rule", "evenodd");
      setStyle(sadIpodIcon, "clip-rule", "evenodd");
      setStyle(sadIpodIcon, "stroke-linejoin", "round");
      setStyle(sadIpodIcon, "stroke-miterlimit", "2");
      attr(sadIpodIcon, "viewBox", "0 0 100 100");
      attr(errorMessage, "class", "error-message svelte-qjo9zb");
      attr(sadIpodContainer, "class", "sad-ipod-container svelte-qjo9zb");
      attr(ipodOverlayScreen, "class", "ipod-overlay-screen svelte-qjo9zb");
      attr(ipodOverlayScreen, "data-testid", "ipod-error-screen");
      attr(ipodOverlayScreen, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, ipodOverlayScreen, anchor);
      append(ipodOverlayScreen, sadIpodContainer);
      append(sadIpodContainer, sadIpodIcon);
      append(sadIpodContainer, spacer);
      append(sadIpodContainer, errorMessage);
      append(errorMessage, textNode);
    },
    update(
      nextContext: ReturnType<typeof offlineMessageInstance>,
      [dirty]: number[],
    ) {
      if (dirty & 1) {
        setData(textNode, nextContext[OfflineSlot.message]);
      }
    },
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(ipodOverlayScreen);
      }
    },
  };
}
function offlineMessageInstance(
  component: Component<unknown[], OfflineProps>,
  props: OfflineProps,
  invalidate: Invalidate,
) {
  let { message } = props;
  component.$$set = (value) => {
    if ("message" in value) {
      invalidate(OfflineSlot.message, (message = value.message!));
    }
  };
  return [message] satisfies [unknown, ...unknown[]];
}
class OfflineMessage extends SvelteComponent<
  ReturnType<typeof offlineMessageInstance>,
  OfflineProps
> {
  constructor(options: ComponentOptions<OfflineProps>) {
    super();
    initComponent(
      this,
      options,
      offlineMessageInstance,
      renderOffline,
      safeNotEqual,
      {
        message: OfflineSlot.message,
      },
      offlineStyles,
    );
  }
  get message() {
    return this.$$.ctx[OfflineSlot.message]!;
  }
  set message(message: OfflineProps["message"]) {
    this.$$set!({
      message,
    });
    flush();
  }
}
createSvelteCustomElement(
  OfflineMessage,
  {
    message: {},
  },
  [],
  [],
  true,
);
export { OfflineMessage };
