import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  ComponentOptions,
} from "../runtime-types.js";
import type {
  MenuProps,
  WheelProps,
  OfflineProps,
  DeviceProps,
} from "../view-types.js";
import type { DeviceContext } from "../controllers.js";
import { DeviceSlot } from "../slots.js";
import {
  SvelteComponent,
  addFlushCallback,
  append,
  appendStyles,
  attr,
  bindingCallbacks,
  checkOutros,
  bindProp,
  createFragment,
  createSvelteCustomElement,
  destroyComponent,
  detach,
  element,
  flush,
  groupOutros,
  initComponent,
  insert,
  listen,
  mountComponent,
  noop,
  runAll,
  safeNotEqual,
  setData,
  space,
  text,
  toggleClass,
  transitionIn,
  transitionOut,
} from "../runtime.js";
import { ipodInstance } from "../controllers.js";
import { Menu } from "./menu.js";
import { ClickWheel } from "./wheel.js";
import { StartupScreen } from "./startup.js";
import { OfflineMessage } from "./offline.js";
import { deviceCss } from "./styles.js";
function deviceStyles(root: DomParent) {
  appendStyles(root, "svelte-4kg78n", deviceCss);
}
function renderStartupOverlay(context: DeviceContext) {
  let startupScreen: StartupScreen, active: boolean;
  startupScreen = new StartupScreen({});
  return {
    create() {
      createFragment(startupScreen.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(startupScreen, target, anchor);
      active = true;
    },
    update: noop,
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(startupScreen.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(startupScreen.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(startupScreen, detaching);
    },
  };
}
function renderOfflineOverlay(context: DeviceContext) {
  let offlineMessage: OfflineMessage, active: boolean;
  offlineMessage = new OfflineMessage({
    props: {
      message: context[DeviceSlot.offlineMessage],
    },
  });
  return {
    create() {
      createFragment(offlineMessage.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(offlineMessage, target, anchor);
      active = true;
    },
    update(nextContext: DeviceContext, dirty: number[]) {
      const attributes: Partial<OfflineProps> = {};
      if (dirty[0] & (1 << DeviceSlot.offlineMessage)) {
        attributes.message = nextContext[DeviceSlot.offlineMessage];
      }
      offlineMessage.$set(attributes);
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(offlineMessage.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(offlineMessage.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(offlineMessage, detaching);
    },
  };
}
function renderDevice(context: DeviceContext) {
  let ipod: HTMLDivElement,
    ipodShadow: HTMLDivElement,
    ipodShadowInner: HTMLDivElement,
    ipodContainer: HTMLDivElement,
    ipodScreen: HTMLDivElement,
    overlayIndex: number,
    overlay:
      | ReturnType<typeof renderOfflineOverlay>
      | ReturnType<typeof renderStartupOverlay>
      | null,
    spacer: Text,
    loadingMessage: HTMLParagraphElement,
    statusText: Text,
    spacer2: Text,
    menuLayer: HTMLDivElement,
    menu: Menu,
    updatingScrollTarget: boolean,
    updatingSelectHold: boolean,
    spacer3: Text,
    clickWheel: ClickWheel,
    current: boolean,
    listening: boolean,
    dispose: (() => void)[];
  const branches = [renderOfflineOverlay, renderStartupOverlay],
    overlays: (
      | ReturnType<typeof renderOfflineOverlay>
      | ReturnType<typeof renderStartupOverlay>
      | null
    )[] = [];
  function selectBranch(context2: DeviceContext, dirty?: unknown) {
    return context2[DeviceSlot.isPlaybackAllowed]
      ? context2[DeviceSlot.isLoading]
        ? 1
        : -1
      : 0;
  }
  if (~(overlayIndex = selectBranch(context))) {
    overlay = overlays[overlayIndex] = branches[overlayIndex](context);
  }
  function scrollTargetChanged(target: Model.ScrollTarget) {
    context[DeviceSlot.scrollTargetChanged](target);
  }
  function selectHoldChanged(duration: number | null) {
    context[DeviceSlot.selectHoldChanged](duration);
  }
  let props: MenuProps = {
    disabled: context[DeviceSlot.isInert],
    data:
      context[DeviceSlot.catalogState].status === "ready"
        ? context[DeviceSlot.catalogState].data
        : void 0,
    playback: context[DeviceSlot.playbackStore],
    navigateToUrl: context[DeviceSlot.navigateToUrl],
  };
  if (context[DeviceSlot.scrollTarget] !== void 0) {
    props.scrollTarget = context[DeviceSlot.scrollTarget];
  }
  if (context[DeviceSlot.selectHoldMs] !== void 0) {
    props.selectHoldMs = context[DeviceSlot.selectHoldMs];
  }
  menu = new Menu({
    props,
  });
  context[DeviceSlot.bindMenu](menu);
  bindingCallbacks.push(() =>
    bindProp(menu, "scrollTarget", scrollTargetChanged),
  );
  bindingCallbacks.push(() =>
    bindProp(menu, "selectHoldMs", selectHoldChanged),
  );
  menu.$on("menuhold", context[DeviceSlot.backlight].toggle);
  clickWheel = new ClickWheel({
    props: {
      scrollTarget: context[DeviceSlot.scrollTarget],
      isPlaying: context[DeviceSlot.playbackState].hasLoadedItem
        ? context[DeviceSlot.playbackState].isPlaying
        : context[DeviceSlot.playbackState].isLoading,
      selectHoldMs: context[DeviceSlot.selectHoldMs],
      disabled: context[DeviceSlot.isLoading],
      disableSkip: context[DeviceSlot.isSeeking],
    },
  });
  clickWheel.$on("scroll", context[DeviceSlot.wheelscroll]);
  clickWheel.$on("keyscroll", context[DeviceSlot.wheelkeystep]);
  clickWheel.$on("steer", context[DeviceSlot.steerPaddle]);
  clickWheel.$on("select", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.select])();
  });
  clickWheel.$on("selecthold", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.selectHold])();
  });
  clickWheel.$on("menu", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.back])();
  });
  clickWheel.$on("menuhold", context[DeviceSlot.backlight].toggle);
  clickWheel.$on("playpause", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.play])();
  });
  clickWheel.$on("dragstart", context[DeviceSlot.wheelDragStart]);
  clickWheel.$on("dragend", context[DeviceSlot.wheelDragEnd]);
  clickWheel.$on("back", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.previous])();
  });
  clickWheel.$on("forward", function () {
    context[DeviceSlot.whenInteractive](context[DeviceSlot.next])();
  });
  clickWheel.$on("backhold", context[DeviceSlot.seekBackward]);
  clickWheel.$on("forwardhold", context[DeviceSlot.seekForward]);
  return {
    create() {
      ipod = element("div");
      ipodShadow = element("div");
      ipodShadowInner = element("div");
      ipodContainer = element("div");
      ipodScreen = element("div");
      if (overlay) {
        overlay.create();
      }
      spacer = space();
      loadingMessage = element("p");
      statusText = text(context[DeviceSlot.status]);
      spacer2 = space();
      menuLayer = element("div");
      createFragment(menu.$$.fragment);
      spacer3 = space();
      createFragment(clickWheel.$$.fragment);
      attr(loadingMessage, "class", "loading-message svelte-4kg78n");
      attr(loadingMessage, "role", "status");
      attr(menuLayer, "class", "menu-layer svelte-4kg78n");
      attr(menuLayer, "data-testid", "menu-layer");
      toggleClass(menuLayer, "hidden", context[DeviceSlot.isInert]);
      attr(ipodScreen, "class", "ipod-screen svelte-4kg78n");
      attr(ipodScreen, "data-testid", "ipod-screen");
      toggleClass(ipodScreen, "backlit", context[DeviceSlot.isBacklit]);
      attr(ipodContainer, "class", "ipod-container svelte-4kg78n");
      attr(ipodContainer, "data-testid", "ipod-container");
      attr(ipodShadowInner, "class", "ipod-shadow-inner svelte-4kg78n");
      attr(ipodShadow, "class", "ipod-shadow svelte-4kg78n");
      attr(ipod, "class", "ipod svelte-4kg78n");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, ipod, anchor);
      append(ipod, ipodShadow);
      append(ipodShadow, ipodShadowInner);
      append(ipodShadowInner, ipodContainer);
      append(ipodContainer, ipodScreen);
      if (~overlayIndex) {
        overlays[overlayIndex]!.mount(ipodScreen, null);
      }
      append(ipodScreen, spacer);
      append(ipodScreen, loadingMessage);
      append(loadingMessage, statusText);
      append(ipodScreen, spacer2);
      append(ipodScreen, menuLayer);
      mountComponent(menu, menuLayer, null);
      append(ipodContainer, spacer3);
      mountComponent(clickWheel, ipodContainer, null);
      current = true;
      if (!listening) {
        dispose = [
          listen(
            ipodContainer,
            "pointerdown",
            context[DeviceSlot.activateAudio],
          ),
          listen(
            ipodContainer,
            "keydown",
            context[DeviceSlot.keydownActivity],
            true,
          ),
          listen(ipodContainer, "click", context[DeviceSlot.activateAudio]),
        ];
        listening = true;
      }
    },
    update(nextContext: DeviceContext, dirty: number[]) {
      context = nextContext;
      let previousIndex = overlayIndex;
      overlayIndex = selectBranch(context);
      if (overlayIndex === previousIndex) {
        if (~overlayIndex) {
          overlays[overlayIndex]!.update(context, dirty);
        }
      } else {
        if (overlay) {
          groupOutros();
          transitionOut(overlays[previousIndex], 1, 1, () => {
            overlays[previousIndex] = null;
          });
          checkOutros();
        }
        if (~overlayIndex) {
          overlay = overlays[overlayIndex];
          if (overlay) {
            overlay.update(context, dirty);
          } else {
            overlay = overlays[overlayIndex] = branches[overlayIndex](context);
            overlay.create();
          }
          transitionIn(overlay, 1);
          overlay.mount(ipodScreen, spacer);
        } else {
          overlay = null;
        }
      }
      if (!current || dirty[0] & (1 << DeviceSlot.status)) {
        setData(statusText, context[DeviceSlot.status]);
      }
      const attributes: Partial<MenuProps> = {};
      if (dirty[0] & (1 << DeviceSlot.isInert)) {
        attributes.disabled = context[DeviceSlot.isInert];
      }
      if (dirty[0] & (1 << DeviceSlot.catalogState)) {
        attributes.data =
          context[DeviceSlot.catalogState].status === "ready"
            ? context[DeviceSlot.catalogState].data
            : void 0;
      }
      if (dirty[0] & (1 << DeviceSlot.navigateToUrl)) {
        attributes.navigateToUrl = context[DeviceSlot.navigateToUrl];
      }
      if (!updatingScrollTarget && dirty[0] & (1 << DeviceSlot.scrollTarget)) {
        updatingScrollTarget = true;
        attributes.scrollTarget = context[DeviceSlot.scrollTarget];
        addFlushCallback(() => (updatingScrollTarget = false));
      }
      if (!updatingSelectHold && dirty[0] & (1 << DeviceSlot.selectHoldMs)) {
        updatingSelectHold = true;
        attributes.selectHoldMs = context[DeviceSlot.selectHoldMs];
        addFlushCallback(() => (updatingSelectHold = false));
      }
      menu.$set(attributes);
      if (!current || dirty[0] & (1 << DeviceSlot.isInert)) {
        toggleClass(menuLayer, "hidden", context[DeviceSlot.isInert]);
      }
      if (!current || dirty[0] & (1 << DeviceSlot.isBacklit)) {
        toggleClass(ipodScreen, "backlit", context[DeviceSlot.isBacklit]);
      }
      const value4: Partial<WheelProps> = {};
      if (dirty[0] & (1 << DeviceSlot.scrollTarget)) {
        value4.scrollTarget = context[DeviceSlot.scrollTarget];
      }
      if (dirty[0] & (1 << DeviceSlot.playbackState)) {
        value4.isPlaying = context[DeviceSlot.playbackState].hasLoadedItem
          ? context[DeviceSlot.playbackState].isPlaying
          : context[DeviceSlot.playbackState].isLoading;
      }
      if (dirty[0] & (1 << DeviceSlot.selectHoldMs)) {
        value4.selectHoldMs = context[DeviceSlot.selectHoldMs];
      }
      if (dirty[0] & (1 << DeviceSlot.isLoading)) {
        value4.disabled = context[DeviceSlot.isLoading];
      }
      if (dirty[0] & (1 << DeviceSlot.isSeeking)) {
        value4.disableSkip = context[DeviceSlot.isSeeking];
      }
      clickWheel.$set(value4);
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(overlay);
        transitionIn(menu.$$.fragment, local);
        transitionIn(clickWheel.$$.fragment, local);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(overlay);
      transitionOut(menu.$$.fragment, local);
      transitionOut(clickWheel.$$.fragment, local);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(ipod);
      }
      if (~overlayIndex) {
        overlays[overlayIndex]!.destroy();
      }
      context[DeviceSlot.bindMenu](null);
      destroyComponent(menu);
      destroyComponent(clickWheel);
      listening = false;
      runAll(dispose);
    },
  };
}
class IPodComponent extends SvelteComponent<
  ReturnType<typeof ipodInstance>,
  DeviceProps
> {
  constructor(options: ComponentOptions<DeviceProps>) {
    super();
    initComponent(
      this,
      options,
      ipodInstance,
      renderDevice,
      safeNotEqual,
      {
        locale: DeviceSlot.locale,
        dragStepDegrees: DeviceSlot.dragStepDegrees,
        backlit: DeviceSlot.backlit,
        playback: DeviceSlot.hostPlayback,
        navigateToUrl: DeviceSlot.navigateToUrl,
        i18n: DeviceSlot.hostI18n,
        iPodDataStore: DeviceSlot.iPodDataStore,
      },
      deviceStyles,
      [-1, -1, -1],
    );
  }
  get locale() {
    return this.$$.ctx[DeviceSlot.locale]!;
  }
  set locale(locale: DeviceProps["locale"]) {
    this.$$set!({
      locale,
    });
    flush();
  }
  get dragStepDegrees() {
    return this.$$.ctx[DeviceSlot.dragStepDegrees]!;
  }
  set dragStepDegrees(dragStepDegrees: DeviceProps["dragStepDegrees"]) {
    this.$$set!({
      dragStepDegrees,
    });
    flush();
  }
  get backlit() {
    return this.$$.ctx[DeviceSlot.backlit]!;
  }
  set backlit(backlit: DeviceProps["backlit"]) {
    this.$$set!({
      backlit,
    });
    flush();
  }
  get playback() {
    return this.$$.ctx[DeviceSlot.hostPlayback]!;
  }
  set playback(playback: DeviceProps["playback"]) {
    this.$$set!({
      playback,
    });
    flush();
  }
  get navigateToUrl() {
    return this.$$.ctx[DeviceSlot.navigateToUrl]!;
  }
  set navigateToUrl(navigateToUrl: DeviceProps["navigateToUrl"]) {
    this.$$set!({
      navigateToUrl,
    });
    flush();
  }
  get i18n() {
    return this.$$.ctx[DeviceSlot.hostI18n]!;
  }
  set i18n(i18n: DeviceProps["i18n"]) {
    this.$$set!({
      i18n,
    });
    flush();
  }
  get iPodDataStore() {
    return this.$$.ctx[DeviceSlot.iPodDataStore]!;
  }
}
createSvelteCustomElement(
  IPodComponent,
  {
    locale: {},
    dragStepDegrees: {},
    backlit: {},
    playback: {},
    navigateToUrl: {},
    i18n: {},
  },
  [],
  ["iPodDataStore"],
  true,
);
export { IPodComponent };
