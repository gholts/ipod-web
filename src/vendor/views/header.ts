import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { HeaderProps } from "../view-types.js";
import { HeaderSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  checkOutros,
  createFragment,
  createSvelteCustomElement,
  destroyComponent,
  detach,
  element,
  empty,
  flush,
  groupOutros,
  initComponent,
  insert,
  mountComponent,
  safeNotEqual,
  setData,
  space,
  text,
  transitionIn,
  transitionOut,
} from "../runtime.js";
import { PauseIndicator, PlayIndicator } from "./icons.js";
import { headerCss } from "./styles.js";
type Context = ReturnType<typeof screenHeaderInstance>;
function headerStyles(root: DomParent) {
  appendStyles(root, "svelte-1bjtjdb", headerCss);
}
function renderPlaybackIndicator(context: Context) {
  let index: number,
    block: ReturnType<typeof renderPausedIndicator> | null,
    anchor: Text,
    active: boolean;
  const branches = [renderPlayingIndicator, renderPausedIndicator],
    blocks: (ReturnType<typeof renderPausedIndicator> | null)[] = [];
  function selectBranch(context2: Context, dirty?: unknown) {
    return context2[HeaderSlot.isPlaying] ? 0 : 1;
  }
  index = selectBranch(context);
  block = blocks[index] = branches[index](context);
  return {
    create() {
      block!.create();
      anchor = empty();
    },
    mount(target: DomParent, anchor2: Node | null) {
      blocks[index]!.mount(target, anchor2);
      insert(target, anchor, anchor2);
      active = true;
    },
    update(nextContext: Context, dirty: number) {
      let previousIndex = index;
      index = selectBranch(nextContext);
      if (index !== previousIndex) {
        groupOutros();
        transitionOut(blocks[previousIndex], 1, 1, () => {
          blocks[previousIndex] = null;
        });
        checkOutros();
        block = blocks[index];
        if (!block) {
          block = blocks[index] = branches[index](nextContext);
          block!.create();
        }
        transitionIn(block, 1);
        block.mount(anchor.parentNode!, anchor);
      }
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(block);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(block);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(anchor);
      }
      blocks[index]!.destroy(detaching);
    },
  };
}
function renderPausedIndicator(context: Context) {
  let playIcon: HTMLDivElement,
    pauseIndicator: InstanceType<typeof PauseIndicator>,
    active: boolean;
  pauseIndicator = new PauseIndicator({});
  return {
    create() {
      playIcon = element("div");
      createFragment(pauseIndicator.$$.fragment);
      attr(playIcon, "class", "play-icon pause svelte-1bjtjdb");
      attr(playIcon, "data-testid", "now-playing-indicator");
      attr(playIcon, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, playIcon, anchor);
      mountComponent(pauseIndicator, playIcon, null);
      active = true;
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(pauseIndicator.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(pauseIndicator.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(playIcon);
      }
      destroyComponent(pauseIndicator);
    },
  };
}
function renderPlayingIndicator(context: Context) {
  let playIcon: HTMLDivElement,
    playIndicator: InstanceType<typeof PlayIndicator>,
    active: boolean;
  playIndicator = new PlayIndicator({});
  return {
    create() {
      playIcon = element("div");
      createFragment(playIndicator.$$.fragment);
      attr(playIcon, "class", "play-icon play svelte-1bjtjdb");
      attr(playIcon, "data-testid", "now-playing-indicator");
      attr(playIcon, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, playIcon, anchor);
      mountComponent(playIndicator, playIcon, null);
      active = true;
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(playIndicator.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(playIndicator.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(playIcon);
      }
      destroyComponent(playIndicator);
    },
  };
}
function renderTitle(context: Context) {
  let screenTitle: HTMLDivElement, titleText: Text;
  return {
    create() {
      screenTitle = element("div");
      titleText = text(context[HeaderSlot.title]);
      attr(screenTitle, "class", "screen-title svelte-1bjtjdb");
      attr(screenTitle, "dir", "auto");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, screenTitle, anchor);
      append(screenTitle, titleText);
    },
    update(nextContext: Context, dirty: number) {
      if (dirty & (1 << HeaderSlot.title)) {
        setData(titleText, nextContext[HeaderSlot.title]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(screenTitle);
      }
    },
  };
}
function renderBrickScore(context: Context) {
  let screenTitle: HTMLDivElement,
    ballsLeft: HTMLSpanElement,
    brickBallsText: Text,
    spacer: Text,
    gameScore: HTMLSpanElement,
    brickScoreText: Text;
  return {
    create() {
      screenTitle = element("div");
      ballsLeft = element("span");
      brickBallsText = text(context[HeaderSlot.brickBalls]);
      spacer = space();
      gameScore = element("span");
      brickScoreText = text(context[HeaderSlot.brickScore]);
      attr(ballsLeft, "class", "balls-left svelte-1bjtjdb");
      attr(ballsLeft, "data-testid", "brick-balls");
      attr(gameScore, "class", "game-score svelte-1bjtjdb");
      attr(gameScore, "data-testid", "brick-score");
      attr(
        screenTitle,
        "class",
        "screen-title brick-game-title svelte-1bjtjdb",
      );
      attr(screenTitle, "dir", "ltr");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, screenTitle, anchor);
      append(screenTitle, ballsLeft);
      append(ballsLeft, brickBallsText);
      append(screenTitle, spacer);
      append(screenTitle, gameScore);
      append(gameScore, brickScoreText);
    },
    update(nextContext: Context, dirty: number) {
      if (dirty & (1 << HeaderSlot.brickBalls)) {
        setData(brickBallsText, nextContext[HeaderSlot.brickBalls]);
      }
      if (dirty & (1 << HeaderSlot.brickScore)) {
        setData(brickScoreText, nextContext[HeaderSlot.brickScore]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(screenTitle);
      }
    },
  };
}
function renderHeader(context: Context) {
  let menuTitle: HTMLDivElement,
    spacer: Text,
    batteryIndicator: HTMLDivElement,
    spacer2: Text,
    active: boolean,
    block:
      | ReturnType<typeof renderPlaybackIndicator>
      | null
      | false
      | ""
      | undefined =
      context[HeaderSlot.hasLoadedItem] && renderPlaybackIndicator(context);
  function selectBranch(context2: Context, dirty?: unknown) {
    return context2[HeaderSlot.isBrick] ? renderBrickScore : renderTitle;
  }
  let value2 = selectBranch(context),
    value3 = value2(context);
  return {
    create() {
      menuTitle = element("div");
      if (block) {
        block.create();
      }
      spacer = space();
      batteryIndicator = element("div");
      spacer2 = space();
      value3.create();
      attr(batteryIndicator, "class", "battery-indicator svelte-1bjtjdb");
      attr(batteryIndicator, "data-testid", "battery-indicator");
      attr(batteryIndicator, "aria-hidden", "true");
      attr(menuTitle, "id", "menu-title");
      attr(menuTitle, "class", "menu-title svelte-1bjtjdb");
      attr(menuTitle, "data-testid", "menu-title");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, menuTitle, anchor);
      if (block) {
        block.mount(menuTitle, null);
      }
      append(menuTitle, spacer);
      append(menuTitle, batteryIndicator);
      append(menuTitle, spacer2);
      value3.mount(menuTitle, null);
      active = true;
    },
    update(nextContext: Context, [dirty]: number[]) {
      if (nextContext[HeaderSlot.hasLoadedItem]) {
        if (block) {
          block.update(nextContext, dirty);
          if (dirty & 2) {
            transitionIn(block, 1);
          }
        } else {
          block = renderPlaybackIndicator(nextContext);
          block.create();
          transitionIn(block, 1);
          block.mount(menuTitle, spacer);
        }
      } else if (block) {
        groupOutros();
        transitionOut(block, 1, 1, () => {
          block = null;
        });
        checkOutros();
      }
      if (value2 === (value2 = selectBranch(nextContext)) && value3) {
        value3.update(nextContext, dirty);
      } else {
        value3.destroy(1);
        value3 = value2(nextContext);
        if (value3) {
          value3.create();
          value3.mount(menuTitle, null);
        }
      }
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(block);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(block);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(menuTitle);
      }
      if (block) {
        block.destroy();
      }
      value3.destroy();
    },
  };
}
function screenHeaderInstance(
  component: Component<unknown[], HeaderProps>,
  props: HeaderProps,
  invalidate: Invalidate,
) {
  let { title } = props,
    { hasLoadedItem } = props,
    { isPlaying } = props,
    { isBrick = false } = props,
    { brickBalls = 0 } = props,
    { brickScore = 0 } = props;
  component.$$set = (value) => {
    if ("title" in value) {
      invalidate(HeaderSlot.title, (title = value.title!));
    }
    if ("hasLoadedItem" in value) {
      invalidate(
        HeaderSlot.hasLoadedItem,
        (hasLoadedItem = value.hasLoadedItem!),
      );
    }
    if ("isPlaying" in value) {
      invalidate(HeaderSlot.isPlaying, (isPlaying = value.isPlaying!));
    }
    if ("isBrick" in value) {
      invalidate(HeaderSlot.isBrick, (isBrick = value.isBrick!));
    }
    if ("brickBalls" in value) {
      invalidate(HeaderSlot.brickBalls, (brickBalls = value.brickBalls!));
    }
    if ("brickScore" in value) {
      invalidate(HeaderSlot.brickScore, (brickScore = value.brickScore!));
    }
  };
  return [
    title,
    hasLoadedItem,
    isPlaying,
    isBrick,
    brickBalls,
    brickScore,
  ] satisfies [unknown, ...unknown[]];
}
class ScreenHeader extends SvelteComponent<Context, HeaderProps> {
  constructor(options: ComponentOptions<HeaderProps>) {
    super();
    initComponent(
      this,
      options,
      screenHeaderInstance,
      renderHeader,
      safeNotEqual,
      {
        title: HeaderSlot.title,
        hasLoadedItem: HeaderSlot.hasLoadedItem,
        isPlaying: HeaderSlot.isPlaying,
        isBrick: HeaderSlot.isBrick,
        brickBalls: HeaderSlot.brickBalls,
        brickScore: HeaderSlot.brickScore,
      },
      headerStyles,
    );
  }
  get title() {
    return this.$$.ctx[HeaderSlot.title]!;
  }
  set title(title: HeaderProps["title"]) {
    this.$$set!({
      title,
    });
    flush();
  }
  get hasLoadedItem() {
    return this.$$.ctx[HeaderSlot.hasLoadedItem]!;
  }
  set hasLoadedItem(hasLoadedItem: HeaderProps["hasLoadedItem"]) {
    this.$$set!({
      hasLoadedItem,
    });
    flush();
  }
  get isPlaying() {
    return this.$$.ctx[HeaderSlot.isPlaying]!;
  }
  set isPlaying(isPlaying: HeaderProps["isPlaying"]) {
    this.$$set!({
      isPlaying,
    });
    flush();
  }
  get isBrick() {
    return this.$$.ctx[HeaderSlot.isBrick]!;
  }
  set isBrick(isBrick: HeaderProps["isBrick"]) {
    this.$$set!({
      isBrick,
    });
    flush();
  }
  get brickBalls() {
    return this.$$.ctx[HeaderSlot.brickBalls]!;
  }
  set brickBalls(brickBalls: HeaderProps["brickBalls"]) {
    this.$$set!({
      brickBalls,
    });
    flush();
  }
  get brickScore() {
    return this.$$.ctx[HeaderSlot.brickScore]!;
  }
  set brickScore(brickScore: HeaderProps["brickScore"]) {
    this.$$set!({
      brickScore,
    });
    flush();
  }
}
createSvelteCustomElement(
  ScreenHeader,
  {
    title: {},
    hasLoadedItem: {},
    isPlaying: {},
    isBrick: {
      type: "Boolean",
    },
    brickBalls: {},
    brickScore: {},
  },
  [],
  [],
  true,
);
export { ScreenHeader };
