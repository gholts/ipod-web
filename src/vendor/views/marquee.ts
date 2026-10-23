import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { MarqueeProps } from "../view-types.js";
import { MarqueeSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  createSvelteCustomElement,
  detach,
  element,
  flush,
  actionDestroyer,
  initComponent,
  insert,
  noop,
  safeNotEqual,
  setData,
  setStyle,
  space,
  text,
  toggleClass,
} from "../runtime.js";
import { marqueeCss } from "./styles.js";
type Context = ReturnType<typeof marqueeInstance>;
function marqueeStyles(root: DomParent) {
  appendStyles(root, "svelte-61q7q9", marqueeCss);
}
function renderMarqueeCopy(context: Context) {
  let marqueeCopy: HTMLSpanElement, textText: Text;
  return {
    create() {
      marqueeCopy = element("span");
      textText = text(context[MarqueeSlot.text]);
      attr(marqueeCopy, "class", "marquee-copy svelte-61q7q9");
      attr(marqueeCopy, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, marqueeCopy, anchor);
      append(marqueeCopy, textText);
    },
    update(nextContext: Context, dirty: number) {
      if (dirty & (1 << MarqueeSlot.text)) {
        setData(textText, nextContext[MarqueeSlot.text]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(marqueeCopy);
      }
    },
  };
}
function renderMarqueeTrack(context: Context) {
  let marqueeTrack: HTMLDivElement,
    marqueeCopy: HTMLSpanElement,
    textText: Text,
    spacer: Text,
    listening: boolean,
    dispose: () => void,
    block:
      ReturnType<typeof renderMarqueeCopy> | null | false | "" | undefined =
      context[MarqueeSlot.scrolling] && renderMarqueeCopy(context);
  return {
    create() {
      marqueeTrack = element("div");
      marqueeCopy = element("span");
      textText = text(context[MarqueeSlot.text]);
      spacer = space();
      if (block) {
        block.create();
      }
      attr(marqueeCopy, "class", "marquee-copy svelte-61q7q9");
      attr(marqueeTrack, "class", "marquee-track svelte-61q7q9");
      setStyle(
        marqueeTrack,
        "--marquee-copy-width",
        context[MarqueeSlot.copyWidth],
      );
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, marqueeTrack, anchor);
      append(marqueeTrack, marqueeCopy);
      append(marqueeCopy, textText);
      append(marqueeTrack, spacer);
      if (block) {
        block.mount(marqueeTrack, null);
      }
      if (!listening) {
        dispose = actionDestroyer(
          context[MarqueeSlot.measure].call(
            null,
            marqueeCopy,
            context[MarqueeSlot.measureCopy],
          ),
        );
        listening = true;
      }
    },
    update(nextContext: Context, dirty: number) {
      if (dirty & (1 << MarqueeSlot.text)) {
        setData(textText, nextContext[MarqueeSlot.text]);
      }
      if (nextContext[MarqueeSlot.scrolling]) {
        if (block) {
          block.update(nextContext, dirty);
        } else {
          block = renderMarqueeCopy(nextContext);
          block.create();
          block.mount(marqueeTrack, null);
        }
      } else if (block) {
        block.destroy(1);
        block = null;
      }
      if (dirty & (1 << MarqueeSlot.copyWidth)) {
        setStyle(
          marqueeTrack,
          "--marquee-copy-width",
          nextContext[MarqueeSlot.copyWidth],
        );
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(marqueeTrack);
      }
      if (block) {
        block.destroy();
      }
      listening = false;
      dispose();
    },
  };
}
function renderMarquee(context: Context) {
  let marquee: HTMLDivElement,
    restartKey = context[MarqueeSlot.restartKey],
    listening: boolean,
    dispose: () => void,
    block = renderMarqueeTrack(context);
  return {
    create() {
      marquee = element("div");
      block.create();
      attr(marquee, "class", "marquee svelte-61q7q9");
      attr(marquee, "dir", "auto");
      toggleClass(marquee, "scrolling", context[MarqueeSlot.scrolling]);
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, marquee, anchor);
      block.mount(marquee, null);
      if (!listening) {
        dispose = actionDestroyer(
          context[MarqueeSlot.measure].call(
            null,
            marquee,
            context[MarqueeSlot.measureContainer],
          ),
        );
        listening = true;
      }
    },
    update(nextContext: Context, [dirty]: number[]) {
      if (
        dirty & 16 &&
        safeNotEqual(
          restartKey,
          (restartKey = nextContext[MarqueeSlot.restartKey]),
        )
      ) {
        block.destroy(1);
        block = renderMarqueeTrack(nextContext);
        block.create();
        block.mount(marquee, null);
      } else {
        block.update(nextContext, dirty);
      }
      if (dirty & 8) {
        toggleClass(marquee, "scrolling", nextContext[MarqueeSlot.scrolling]);
      }
    },
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(marquee);
      }
      block.destroy(detaching);
      listening = false;
      dispose();
    },
  };
}
function marqueeInstance(
  component: Component<unknown[], MarqueeProps>,
  props: MarqueeProps,
  invalidate: Invalidate,
) {
  let restartKey!: string,
    scrolling!: boolean,
    { text: text } = props,
    { resetKey = void 0 } = props,
    containerWidth = 0,
    copyWidth = 0;
  const measure = (
      value: HTMLElement,
      dispose: (node: HTMLElement) => void,
    ) => {
      const value2 = new ResizeObserver(() => dispose(value));
      value2.observe(value);
      dispose(value);
      return {
        destroy: () => value2.disconnect(),
      };
    },
    measureCopy = (value: HTMLElement) => {
      invalidate(MarqueeSlot.copyWidth, (copyWidth = value.offsetWidth));
    },
    measureContainer = (value: HTMLElement) => {
      invalidate(
        MarqueeSlot.containerWidth,
        (containerWidth = value.clientWidth),
      );
    };
  component.$$set = (value) => {
    if ("text" in value) {
      invalidate(MarqueeSlot.text, (text = value.text!));
    }
    if ("resetKey" in value) {
      invalidate(MarqueeSlot.resetKey, (resetKey = value.resetKey!));
    }
  };
  component.$$.update = () => {
    if (
      component.$$.dirty[0] &
      ((1 << MarqueeSlot.text) | (1 << MarqueeSlot.resetKey))
    ) {
      invalidate(
        MarqueeSlot.restartKey,
        (restartKey = `${resetKey ?? ""}\0${text}`),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << MarqueeSlot.containerWidth) | (1 << MarqueeSlot.copyWidth))
    ) {
      invalidate(
        MarqueeSlot.scrolling,
        (scrolling = copyWidth - containerWidth > 1),
      );
    }
  };
  return [
    text,
    containerWidth,
    copyWidth,
    scrolling,
    restartKey,
    measure,
    resetKey,
    measureCopy,
    measureContainer,
  ] satisfies [unknown, ...unknown[]];
}
class Marquee extends SvelteComponent<Context, MarqueeProps> {
  constructor(options: ComponentOptions<MarqueeProps>) {
    super();
    initComponent(
      this,
      options,
      marqueeInstance,
      renderMarquee,
      safeNotEqual,
      {
        text: MarqueeSlot.text,
        resetKey: MarqueeSlot.resetKey,
      },
      marqueeStyles,
    );
  }
  get text() {
    return this.$$.ctx[MarqueeSlot.text]!;
  }
  set text(value: MarqueeProps["text"]) {
    this.$$set!({
      text: value,
    });
    flush();
  }
  get resetKey() {
    return this.$$.ctx[MarqueeSlot.resetKey]!;
  }
  set resetKey(resetKey: MarqueeProps["resetKey"]) {
    this.$$set!({
      resetKey,
    });
    flush();
  }
}
createSvelteCustomElement(
  Marquee,
  {
    text: {},
    resetKey: {},
  },
  [],
  [],
  true,
);
export { Marquee };
