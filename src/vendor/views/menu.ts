import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  ComponentOptions,
} from "../runtime-types.js";
import type {
  HeaderProps,
  ListProps,
  NowPlayingProps,
  BrickProps,
  MenuProps,
} from "../view-types.js";
import type { MenuContext } from "../controllers.js";
import { MenuSlot } from "../slots.js";
import {
  SvelteComponent,
  addFlushCallback,
  addRenderCallback,
  append,
  appendStyles,
  attr,
  bindingCallbacks,
  checkOutros,
  bindProp,
  createFragment,
  createInTransition,
  createOutTransition,
  createSvelteCustomElement,
  destroyComponent,
  detach,
  element,
  flush,
  actionDestroyer,
  groupOutros,
  initComponent,
  insert,
  isFunction,
  mountComponent,
  noop,
  safeNotEqual,
  space,
  transitionIn,
  transitionOut,
} from "../runtime.js";
import { keyboardNavigation, slideScreen, volumeToPercent } from "../input.js";
import { menuInstance } from "../controllers.js";
import { ScreenHeader } from "./header.js";
import { MenuList } from "./list.js";
import { NowPlaying } from "./now-playing.js";
import { BrickScreen } from "./brick-screen.js";
import { menuCss } from "./styles.js";
function menuStyles(root: DomParent) {
  appendStyles(root, "svelte-1cxxedm", menuCss);
}
function renderMenuList(context: MenuContext) {
  let menuList: MenuList, active: boolean;
  menuList = new MenuList({
    props: {
      items: context[MenuSlot.currentItems],
      selectedIndex: context[MenuSlot.selectedIndex],
      navigationId: context[MenuSlot.navigationId],
      shouldFocus: context[MenuSlot.shouldFocusNextScreen],
      restoredScrollTop: context[MenuSlot.restoredScrollTop],
    },
  });
  menuList.$on("listmount", context[MenuSlot.listMounted]);
  menuList.$on("listunmount", context[MenuSlot.listUnmounted]);
  return {
    create() {
      createFragment(menuList.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(menuList, target, anchor);
      active = true;
    },
    update(nextContext: MenuContext, dirty: number[]) {
      const attributes: Partial<ListProps> = {};
      if (dirty[0] & (1 << MenuSlot.currentItems)) {
        attributes.items = nextContext[MenuSlot.currentItems];
      }
      if (dirty[0] & (1 << MenuSlot.selectedIndex)) {
        attributes.selectedIndex = nextContext[MenuSlot.selectedIndex];
      }
      if (dirty[0] & (1 << MenuSlot.navigationId)) {
        attributes.navigationId = nextContext[MenuSlot.navigationId];
      }
      if (dirty[0] & (1 << MenuSlot.shouldFocusNextScreen)) {
        attributes.shouldFocus = nextContext[MenuSlot.shouldFocusNextScreen];
      }
      if (dirty[0] & (1 << MenuSlot.restoredScrollTop)) {
        attributes.restoredScrollTop = nextContext[MenuSlot.restoredScrollTop];
      }
      menuList.$set(attributes);
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(menuList.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(menuList.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(menuList, detaching);
    },
  };
}
function renderMenuBrick(context: MenuContext) {
  let brickScreen: BrickScreen,
    updatingScore: boolean,
    updatingBalls: boolean,
    current: boolean;
  function scoreChanged(score: number) {
    context[MenuSlot.scoreChanged](score);
  }
  function ballsChanged(balls: number) {
    context[MenuSlot.ballsChanged](balls);
  }
  let props: Partial<BrickProps> = {
    paused: context[MenuSlot.disabled],
  };
  if (context[MenuSlot.brickScore] !== void 0) {
    props.score = context[MenuSlot.brickScore];
  }
  if (context[MenuSlot.brickBalls] !== void 0) {
    props.balls = context[MenuSlot.brickBalls];
  }
  brickScreen = new BrickScreen({
    props,
  });
  context[MenuSlot.bindBrick](brickScreen);
  bindingCallbacks.push(() => bindProp(brickScreen, "score", scoreChanged));
  bindingCallbacks.push(() => bindProp(brickScreen, "balls", ballsChanged));
  return {
    create() {
      createFragment(brickScreen.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(brickScreen, target, anchor);
      current = true;
    },
    update(nextContext: MenuContext, dirty: number[]) {
      const attributes: Partial<BrickProps> = {};
      if (dirty[0] & (1 << MenuSlot.disabled)) {
        attributes.paused = nextContext[MenuSlot.disabled];
      }
      if (!updatingScore && dirty[0] & (1 << MenuSlot.brickScore)) {
        updatingScore = true;
        attributes.score = nextContext[MenuSlot.brickScore];
        addFlushCallback(() => (updatingScore = false));
      }
      if (!updatingBalls && dirty[0] & (1 << MenuSlot.brickBalls)) {
        updatingBalls = true;
        attributes.balls = nextContext[MenuSlot.brickBalls];
        addFlushCallback(() => (updatingBalls = false));
      }
      brickScreen.$set(attributes);
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(brickScreen.$$.fragment, local);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(brickScreen.$$.fragment, local);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      context[MenuSlot.bindBrick](null);
      destroyComponent(brickScreen, detaching);
    },
  };
}
function renderMenuNowPlaying(context: MenuContext) {
  var value: Model.Song | undefined,
    value2: Model.Song | undefined,
    value3: Model.Song | undefined,
    value4: Model.Song | undefined,
    value5: Model.Song | undefined;
  let nowPlaying: NowPlaying, active: boolean;
  nowPlaying = new NowPlaying({
    props: {
      songIndex: context[MenuSlot.playbackState].queuePosition + 1,
      songCount: context[MenuSlot.playbackState].queue.length,
      songId:
        (value = context[MenuSlot.currentSong]) == null ? void 0 : value.id,
      title:
        (value2 = context[MenuSlot.currentSong]) == null ? void 0 : value2.name,
      titleUrl:
        (value3 = context[MenuSlot.currentSong]) == null ? void 0 : value3.url,
      navigateToUrl: context[MenuSlot.navigateToUrl],
      artistName:
        (value4 = context[MenuSlot.currentSong]) == null
          ? void 0
          : value4.artistName,
      albumName:
        (value5 = context[MenuSlot.currentSong]) == null
          ? void 0
          : value5.albumName,
      currentTime: context[MenuSlot.playbackState].currentPlaybackTime,
      duration: context[MenuSlot.playbackState].currentPlaybackDuration,
      shouldFocus: context[MenuSlot.shouldFocusNextScreen],
      isSeeking: context[MenuSlot.isSeeking],
      seekPreviewTime: context[MenuSlot.seekPreviewTime],
      isAdjustingVolume: context[MenuSlot.isAdjustingVolume],
      volume: volumeToPercent(context[MenuSlot.playbackState].volume),
      isPositionDisabled: !context[MenuSlot.playbackState].hasLoadedItem,
      shuffleMode: context[MenuSlot.playbackState].shuffleMode,
      repeatMode: context[MenuSlot.playbackState].repeatMode,
    },
  });
  nowPlaying.$on("scrubfocus", context[MenuSlot.seekStart]);
  nowPlaying.$on("scrub", context[MenuSlot.seekChanged]);
  nowPlaying.$on("scrubcommit", context[MenuSlot.seekController].commit);
  nowPlaying.$on("scrubblur", context[MenuSlot.seekController].release);
  nowPlaying.$on("volumefocus", context[MenuSlot.volumeStart]);
  nowPlaying.$on("volume", context[MenuSlot.volumeChanged]);
  nowPlaying.$on("volumeblur", context[MenuSlot.volumeController].release);
  return {
    create() {
      createFragment(nowPlaying.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(nowPlaying, target, anchor);
      active = true;
    },
    update(nextContext: MenuContext, dirty: number[]) {
      var value6: Model.Song | undefined,
        value7: Model.Song | undefined,
        value8: Model.Song | undefined,
        value9: Model.Song | undefined,
        value10: Model.Song | undefined;
      const attributes: Partial<NowPlayingProps> = {};
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.songIndex =
          nextContext[MenuSlot.playbackState].queuePosition + 1;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.songCount = nextContext[MenuSlot.playbackState].queue.length;
      }
      if (dirty[0] & (1 << MenuSlot.currentSong)) {
        attributes.songId =
          (value6 = nextContext[MenuSlot.currentSong]) == null
            ? void 0
            : value6.id;
      }
      if (dirty[0] & (1 << MenuSlot.currentSong)) {
        attributes.title =
          (value7 = nextContext[MenuSlot.currentSong]) == null
            ? void 0
            : value7.name;
      }
      if (dirty[0] & (1 << MenuSlot.currentSong)) {
        attributes.titleUrl =
          (value8 = nextContext[MenuSlot.currentSong]) == null
            ? void 0
            : value8.url;
      }
      if (dirty[0] & (1 << MenuSlot.navigateToUrl)) {
        attributes.navigateToUrl = nextContext[MenuSlot.navigateToUrl];
      }
      if (dirty[0] & (1 << MenuSlot.currentSong)) {
        attributes.artistName =
          (value9 = nextContext[MenuSlot.currentSong]) == null
            ? void 0
            : value9.artistName;
      }
      if (dirty[0] & (1 << MenuSlot.currentSong)) {
        attributes.albumName =
          (value10 = nextContext[MenuSlot.currentSong]) == null
            ? void 0
            : value10.albumName;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.currentTime =
          nextContext[MenuSlot.playbackState].currentPlaybackTime;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.duration =
          nextContext[MenuSlot.playbackState].currentPlaybackDuration;
      }
      if (dirty[0] & (1 << MenuSlot.shouldFocusNextScreen)) {
        attributes.shouldFocus = nextContext[MenuSlot.shouldFocusNextScreen];
      }
      if (dirty[0] & (1 << MenuSlot.isSeeking)) {
        attributes.isSeeking = nextContext[MenuSlot.isSeeking];
      }
      if (dirty[0] & (1 << MenuSlot.seekPreviewTime)) {
        attributes.seekPreviewTime = nextContext[MenuSlot.seekPreviewTime];
      }
      if (dirty[0] & (1 << MenuSlot.isAdjustingVolume)) {
        attributes.isAdjustingVolume = nextContext[MenuSlot.isAdjustingVolume];
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.volume = volumeToPercent(
          nextContext[MenuSlot.playbackState].volume,
        );
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.isPositionDisabled =
          !nextContext[MenuSlot.playbackState].hasLoadedItem;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.shuffleMode =
          nextContext[MenuSlot.playbackState].shuffleMode;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.repeatMode = nextContext[MenuSlot.playbackState].repeatMode;
      }
      nowPlaying.$set(attributes);
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(nowPlaying.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(nowPlaying.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(nowPlaying, detaching);
    },
  };
}
function renderScreen(context: MenuContext) {
  let screen: HTMLDivElement,
    screenIndex: number,
    screenView:
      | ReturnType<typeof renderMenuNowPlaying>
      | ReturnType<typeof renderMenuBrick>
      | ReturnType<typeof renderMenuList>
      | null,
    introTransition: {
      start(): void;
      invalidate(): void;
      end(): void;
    },
    outroTransition: {
      end(reset?: unknown): void;
    },
    active: boolean;
  const branches = [renderMenuNowPlaying, renderMenuBrick, renderMenuList],
    screens: (
      | ReturnType<typeof renderMenuNowPlaying>
      | ReturnType<typeof renderMenuBrick>
      | ReturnType<typeof renderMenuList>
      | null
    )[] = [];
  function selectBranch(context2: MenuContext, dirty?: unknown) {
    return context2[MenuSlot.view] === "now-playing"
      ? 0
      : context2[MenuSlot.view] === "brick"
        ? 1
        : 2;
  }
  screenIndex = selectBranch(context);
  screenView = screens[screenIndex] = branches[screenIndex](context);
  return {
    create() {
      screen = element("div");
      screenView!.create();
      attr(screen, "class", "screen svelte-1cxxedm");
      attr(screen, "data-testid", "screen");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, screen, anchor);
      screens[screenIndex]!.mount(screen, null);
      active = true;
    },
    update(nextContext: MenuContext, dirty: number[]) {
      context = nextContext;
      let previousIndex = screenIndex;
      screenIndex = selectBranch(context);
      if (screenIndex === previousIndex) {
        screens[screenIndex]!.update(context, dirty);
      } else {
        groupOutros();
        transitionOut(screens[previousIndex], 1, 1, () => {
          screens[previousIndex] = null;
        });
        checkOutros();
        screenView = screens[screenIndex];
        if (screenView) {
          screenView.update(context, dirty);
        } else {
          screenView = screens[screenIndex] = branches[screenIndex](context);
          screenView!.create();
        }
        transitionIn(screenView, 1);
        screenView.mount(screen, null);
      }
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(screenView);
        if (local) {
          addRenderCallback(() => {
            if (active) {
              if (outroTransition) {
                outroTransition.end(1);
              }
              introTransition = createInTransition(screen, slideScreen, {
                back: context[MenuSlot.goingBack],
              });
              introTransition.start();
            }
          });
        }
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(screenView);
      if (introTransition) {
        introTransition.invalidate();
      }
      if (local) {
        outroTransition = createOutTransition(screen, slideScreen, {
          back: context[MenuSlot.goingBack],
        });
      }
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(screen);
      }
      screens[screenIndex]!.destroy();
      if (detaching && outroTransition) {
        outroTransition.end();
      }
    },
  };
}
function renderMenu(context: MenuContext) {
  let menu: HTMLDivElement,
    screenHeader: ScreenHeader,
    spacer: Text,
    screenBody: HTMLDivElement,
    navigationId = context[MenuSlot.navigationId],
    keyboard: ReturnType<typeof keyboardNavigation>,
    current: boolean,
    listening: boolean,
    dispose: () => void;
  screenHeader = new ScreenHeader({
    props: {
      title: context[MenuSlot.title],
      hasLoadedItem: context[MenuSlot.playbackState].hasLoadedItem,
      isPlaying: context[MenuSlot.playbackState].isPlaying,
      isBrick: context[MenuSlot.view] === "brick",
      brickBalls: context[MenuSlot.brickBalls],
      brickScore: context[MenuSlot.brickScore],
    },
  });
  let block = renderScreen(context);
  return {
    create() {
      menu = element("div");
      createFragment(screenHeader.$$.fragment);
      spacer = space();
      screenBody = element("div");
      block.create();
      attr(screenBody, "class", "screen-body svelte-1cxxedm");
      attr(menu, "class", "menu svelte-1cxxedm");
      attr(menu, "data-testid", "menu");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, menu, anchor);
      mountComponent(screenHeader, menu, null);
      append(menu, spacer);
      append(menu, screenBody);
      block.mount(screenBody, null);
      context[MenuSlot.bindMenuNode](menu);
      current = true;
      if (!listening) {
        dispose = actionDestroyer(
          (keyboard = keyboardNavigation.call(null, screenBody, {
            disabled: context[MenuSlot.disabled],
            navigationId: context[MenuSlot.navigationId],
            mode: context[MenuSlot.keyboardMode],
            onArrow: context[MenuSlot.arrow],
            onSelect: context[MenuSlot.select],
            onBack: context[MenuSlot.back],
            onMenuHold: context[MenuSlot.menuHold],
          })),
        );
        listening = true;
      }
    },
    update(nextContext: MenuContext, dirty: number[]) {
      const attributes: Partial<HeaderProps> = {};
      if (dirty[0] & (1 << MenuSlot.title)) {
        attributes.title = nextContext[MenuSlot.title];
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.hasLoadedItem =
          nextContext[MenuSlot.playbackState].hasLoadedItem;
      }
      if (dirty[0] & (1 << MenuSlot.playbackState)) {
        attributes.isPlaying = nextContext[MenuSlot.playbackState].isPlaying;
      }
      if (dirty[0] & (1 << MenuSlot.view)) {
        attributes.isBrick = nextContext[MenuSlot.view] === "brick";
      }
      if (dirty[0] & (1 << MenuSlot.brickBalls)) {
        attributes.brickBalls = nextContext[MenuSlot.brickBalls];
      }
      if (dirty[0] & (1 << MenuSlot.brickScore)) {
        attributes.brickScore = nextContext[MenuSlot.brickScore];
      }
      screenHeader.$set(attributes);
      if (
        dirty[0] & (1 << MenuSlot.navigationId) &&
        safeNotEqual(
          navigationId,
          (navigationId = nextContext[MenuSlot.navigationId]),
        )
      ) {
        groupOutros();
        transitionOut(block, 1, 1, noop);
        checkOutros();
        block = renderScreen(nextContext);
        block.create();
        transitionIn(block, 1);
        block.mount(screenBody, null);
      } else {
        block.update(nextContext, dirty);
      }
      if (
        keyboard &&
        isFunction(keyboard.update) &&
        dirty[0] &
          ((1 << MenuSlot.disabled) |
            (1 << MenuSlot.navigationId) |
            (1 << MenuSlot.keyboardMode))
      ) {
        keyboard.update.call(null, {
          disabled: nextContext[MenuSlot.disabled],
          navigationId: nextContext[MenuSlot.navigationId],
          mode: nextContext[MenuSlot.keyboardMode],
          onArrow: nextContext[MenuSlot.arrow],
          onSelect: nextContext[MenuSlot.select],
          onBack: nextContext[MenuSlot.back],
          onMenuHold: nextContext[MenuSlot.menuHold],
        });
      }
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(screenHeader.$$.fragment, local);
        transitionIn(block);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(screenHeader.$$.fragment, local);
      transitionOut(block);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(menu);
      }
      destroyComponent(screenHeader);
      block.destroy(detaching);
      context[MenuSlot.bindMenuNode](null);
      listening = false;
      dispose();
    },
  };
}
class Menu extends SvelteComponent<ReturnType<typeof menuInstance>, MenuProps> {
  constructor(options: ComponentOptions<MenuProps>) {
    super();
    initComponent(
      this,
      options,
      menuInstance,
      renderMenu,
      safeNotEqual,
      {
        data: MenuSlot.data,
        playback: MenuSlot.playback,
        navigateToUrl: MenuSlot.navigateToUrl,
        disabled: MenuSlot.disabled,
        seekController: MenuSlot.seekController,
        volumeController: MenuSlot.volumeController,
        scrollTarget: MenuSlot.scrollTarget,
        selectHoldMs: MenuSlot.selectHoldMs,
        currentScrollTarget: MenuSlot.currentScrollTarget,
        back: MenuSlot.back,
        selectHold: MenuSlot.selectHold,
        turnPaddle: MenuSlot.turnPaddle,
        steerPaddle: MenuSlot.steerPaddle,
        notifyActivity: MenuSlot.notifyActivity,
        accelerate: MenuSlot.accelerate,
        moveBy: MenuSlot.moveBy,
        keyStep: MenuSlot.keyStep,
        select: MenuSlot.select,
        play: MenuSlot.play,
      },
      menuStyles,
      [-1, -1, -1],
    );
  }
  get data() {
    return this.$$.ctx[MenuSlot.data]!;
  }
  set data(data: MenuProps["data"]) {
    this.$$set!({
      data,
    });
    flush();
  }
  get playback() {
    return this.$$.ctx[MenuSlot.playback]!;
  }
  set playback(playback: MenuProps["playback"]) {
    this.$$set!({
      playback,
    });
    flush();
  }
  get navigateToUrl() {
    return this.$$.ctx[MenuSlot.navigateToUrl]!;
  }
  set navigateToUrl(navigateToUrl: MenuProps["navigateToUrl"]) {
    this.$$set!({
      navigateToUrl,
    });
    flush();
  }
  get disabled() {
    return this.$$.ctx[MenuSlot.disabled]!;
  }
  set disabled(disabled: MenuProps["disabled"]) {
    this.$$set!({
      disabled,
    });
    flush();
  }
  get seekController() {
    return this.$$.ctx[MenuSlot.seekController]!;
  }
  get volumeController() {
    return this.$$.ctx[MenuSlot.volumeController]!;
  }
  get scrollTarget() {
    return this.$$.ctx[MenuSlot.scrollTarget]!;
  }
  set scrollTarget(scrollTarget: MenuProps["scrollTarget"]) {
    this.$$set!({
      scrollTarget,
    });
    flush();
  }
  get selectHoldMs() {
    return this.$$.ctx[MenuSlot.selectHoldMs]!;
  }
  set selectHoldMs(selectHoldMs: MenuProps["selectHoldMs"]) {
    this.$$set!({
      selectHoldMs,
    });
    flush();
  }
  get currentScrollTarget() {
    return this.$$.ctx[MenuSlot.currentScrollTarget]!;
  }
  get back() {
    return this.$$.ctx[MenuSlot.back]!;
  }
  get selectHold() {
    return this.$$.ctx[MenuSlot.selectHold]!;
  }
  get turnPaddle() {
    return this.$$.ctx[MenuSlot.turnPaddle]!;
  }
  get steerPaddle() {
    return this.$$.ctx[MenuSlot.steerPaddle]!;
  }
  get notifyActivity() {
    return this.$$.ctx[MenuSlot.notifyActivity]!;
  }
  get accelerate() {
    return this.$$.ctx[MenuSlot.accelerate]!;
  }
  get moveBy() {
    return this.$$.ctx[MenuSlot.moveBy]!;
  }
  get keyStep() {
    return this.$$.ctx[MenuSlot.keyStep]!;
  }
  get select() {
    return this.$$.ctx[MenuSlot.select]!;
  }
  get play() {
    return this.$$.ctx[MenuSlot.play]!;
  }
}
createSvelteCustomElement(
  Menu,
  {
    data: {},
    playback: {},
    navigateToUrl: {},
    disabled: {
      type: "Boolean",
    },
    scrollTarget: {},
    selectHoldMs: {},
  },
  [],
  [
    "seekController",
    "volumeController",
    "currentScrollTarget",
    "back",
    "selectHold",
    "turnPaddle",
    "steerPaddle",
    "notifyActivity",
    "accelerate",
    "moveBy",
    "keyStep",
    "select",
    "play",
  ],
  true,
);
export { Menu };
