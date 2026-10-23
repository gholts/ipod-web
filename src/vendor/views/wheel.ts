import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { WheelProps, WheelButton, WheelAction } from "../view-types.js";
import { WheelSlot } from "../slots.js";
import { createLogger } from "../environment.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  bindingCallbacks,
  createEventDispatcher,
  createFragment,
  createSvelteCustomElement,
  destroyComponent,
  detach,
  element,
  flush,
  actionDestroyer,
  globals,
  initComponent,
  insert,
  isFunction,
  listen,
  mountComponent,
  onDestroy,
  runAll,
  safeNotEqual,
  setStyle,
  space,
  subscribeComponent,
  toggleClass,
  transitionIn,
  transitionOut,
} from "../runtime.js";
import {
  buttonHoldMs,
  keyRepeatDelayMs,
  keyRepeatIntervalMs,
  menuHoldMs,
  wheelInnerDiameterPercent,
  wheelOuterDiameterPercent,
} from "../settings.js";
import {
  createHoldTimer,
  longPress,
  wheelRotation,
  wheelTextureUrl,
} from "../input.js";
import { useI18n } from "../i18n.js";
import { MenuLabel, SkipIcon, PlayPauseIcon } from "./icons.js";
import { wheelCss } from "./styles.js";
type Context = ReturnType<typeof clickWheelInstance>;
const { window: windowTarget } = globals;
function wheelStyles(root: DomParent) {
  appendStyles(root, "svelte-nz296x", wheelCss);
}
function renderClickWheel(context: Context) {
  let clickWheel: HTMLDivElement,
    menuButton: HTMLButtonElement,
    menuLabel: InstanceType<typeof MenuLabel>,
    ariaLabelValue: string,
    tabindexValue: number,
    ariaDisabledValue: boolean | undefined,
    spacer: Text,
    backButton: HTMLButtonElement,
    playPauseIcon: PlayPauseIcon,
    ariaLabelValue2: string,
    tabindexValue2: number,
    ariaDisabledValue2: boolean,
    spacer2: Text,
    forwardButton: HTMLButtonElement,
    playPauseIcon2: PlayPauseIcon,
    ariaLabelValue3: string,
    tabindexValue3: number,
    ariaDisabledValue3: boolean,
    spacer3: Text,
    playButton: HTMLButtonElement,
    skipIcon: InstanceType<typeof SkipIcon>,
    ariaLabelValue4: string,
    tabindexValue4: number,
    ariaDisabledValue4: boolean | undefined,
    spacer4: Text,
    wheelDividers: HTMLDivElement,
    spacer5: Text,
    scrollWheel: HTMLDivElement,
    rotation: {
      update(ariaDisabledValue2?: { excludeRadiusRatio?: number }): void;
      destroy(): void;
    },
    spacer6: Text,
    selectButton: HTMLButtonElement,
    ariaLabelValue5: string,
    tabindexValue5: number,
    ariaDisabledValue5: boolean | undefined,
    selectHold: ReturnType<typeof longPress>,
    selectDiameter = `${context[WheelSlot.selectButtonDiameterPercent]}%`,
    wheelDiameter = `${context[WheelSlot.scrollWheelDiameterPercent]}%`,
    wheelTexture = `url(${wheelTextureUrl})`,
    current: boolean,
    listening: boolean,
    dispose: (() => void)[];
  menuLabel = new MenuLabel({
    props: {
      "aria-hidden": "true",
    },
  });
  playPauseIcon = new PlayPauseIcon({
    props: {
      "aria-hidden": "true",
    },
  });
  playPauseIcon2 = new PlayPauseIcon({
    props: {
      "aria-hidden": "true",
    },
  });
  skipIcon = new SkipIcon({
    props: {
      "aria-hidden": "true",
    },
  });
  return {
    create() {
      clickWheel = element("div");
      menuButton = element("button");
      createFragment(menuLabel.$$.fragment);
      spacer = space();
      backButton = element("button");
      createFragment(playPauseIcon.$$.fragment);
      spacer2 = space();
      forwardButton = element("button");
      createFragment(playPauseIcon2.$$.fragment);
      spacer3 = space();
      playButton = element("button");
      createFragment(skipIcon.$$.fragment);
      spacer4 = space();
      wheelDividers = element("div");
      spacer5 = space();
      scrollWheel = element("div");
      spacer6 = space();
      selectButton = element("button");
      attr(menuButton, "class", "wheel-button menu-button svelte-nz296x");
      attr(menuButton, "data-testid", "wheel-menu-button");
      attr(
        menuButton,
        "aria-label",
        (ariaLabelValue = context[WheelSlot.translations].t(
          "ASE.Web.IPod.Wheel.Menu",
        )),
      );
      attr(
        menuButton,
        "tabindex",
        (tabindexValue = context[WheelSlot.disabled] ? -1 : 0),
      );
      attr(
        menuButton,
        "aria-disabled",
        (ariaDisabledValue = context[WheelSlot.disabled] || void 0),
      );
      attr(backButton, "class", "wheel-button back-button svelte-nz296x");
      attr(backButton, "data-testid", "wheel-back-button");
      attr(
        backButton,
        "aria-label",
        (ariaLabelValue2 = context[WheelSlot.translations].t(
          "ASE.Web.IPod.Wheel.Back",
        )),
      );
      attr(
        backButton,
        "tabindex",
        (tabindexValue2 = context[WheelSlot.disabled] ? -1 : 0),
      );
      attr(
        backButton,
        "aria-disabled",
        (ariaDisabledValue2 =
          context[WheelSlot.disabled] || context[WheelSlot.disableSkip]),
      );
      attr(forwardButton, "class", "wheel-button forward-button svelte-nz296x");
      attr(forwardButton, "data-testid", "wheel-forward-button");
      attr(
        forwardButton,
        "aria-label",
        (ariaLabelValue3 = context[WheelSlot.translations].t(
          "ASE.Web.IPod.Wheel.Forward",
        )),
      );
      attr(
        forwardButton,
        "tabindex",
        (tabindexValue3 = context[WheelSlot.disabled] ? -1 : 0),
      );
      attr(
        forwardButton,
        "aria-disabled",
        (ariaDisabledValue3 =
          context[WheelSlot.disabled] || context[WheelSlot.disableSkip]),
      );
      attr(playButton, "class", "wheel-button playpause-button svelte-nz296x");
      attr(playButton, "data-testid", "wheel-playpause-button");
      attr(
        playButton,
        "aria-label",
        (ariaLabelValue4 = context[WheelSlot.translations].t(
          context[WheelSlot.isPlaying]
            ? "ASE.Web.IPod.Wheel.Pause"
            : "ASE.Web.IPod.Wheel.Play",
        )),
      );
      attr(
        playButton,
        "tabindex",
        (tabindexValue4 = context[WheelSlot.disabled] ? -1 : 0),
      );
      attr(
        playButton,
        "aria-disabled",
        (ariaDisabledValue4 = context[WheelSlot.disabled] || void 0),
      );
      attr(wheelDividers, "class", "wheel-dividers svelte-nz296x");
      attr(scrollWheel, "class", "scroll-wheel svelte-nz296x");
      attr(scrollWheel, "data-testid", "wheel-ring");
      attr(scrollWheel, "aria-hidden", "true");
      attr(scrollWheel, "tabindex", "-1");
      attr(selectButton, "class", "select-button svelte-nz296x");
      attr(selectButton, "data-testid", "wheel-select-button");
      attr(
        selectButton,
        "aria-label",
        (ariaLabelValue5 = context[WheelSlot.translations].t(
          "ASE.Web.IPod.Wheel.Select",
        )),
      );
      attr(
        selectButton,
        "tabindex",
        (tabindexValue5 = context[WheelSlot.disabled] ? -1 : 0),
      );
      attr(
        selectButton,
        "aria-disabled",
        (ariaDisabledValue5 = context[WheelSlot.disabled] || void 0),
      );
      attr(clickWheel, "class", "click-wheel svelte-nz296x");
      attr(clickWheel, "data-testid", "click-wheel");
      attr(clickWheel, "dir", "ltr");
      attr(clickWheel, "tabindex", "-1");
      toggleClass(clickWheel, "dragging", context[WheelSlot.dragging]);
      setStyle(clickWheel, "--select-button-pct", selectDiameter);
      setStyle(clickWheel, "--scroll-wheel-pct", wheelDiameter);
      setStyle(clickWheel, "--wheel-noise-texture", wheelTexture);
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, clickWheel, anchor);
      append(clickWheel, menuButton);
      mountComponent(menuLabel, menuButton, null);
      append(clickWheel, spacer);
      append(clickWheel, backButton);
      mountComponent(playPauseIcon, backButton, null);
      append(clickWheel, spacer2);
      append(clickWheel, forwardButton);
      mountComponent(playPauseIcon2, forwardButton, null);
      append(clickWheel, spacer3);
      append(clickWheel, playButton);
      mountComponent(skipIcon, playButton, null);
      append(clickWheel, spacer4);
      append(clickWheel, wheelDividers);
      append(clickWheel, spacer5);
      append(clickWheel, scrollWheel);
      context[WheelSlot.bindRing](scrollWheel);
      append(clickWheel, spacer6);
      append(clickWheel, selectButton);
      context[WheelSlot.bindWheel](clickWheel);
      current = true;
      if (!listening) {
        dispose = [
          listen(windowTarget, "blur", context[WheelSlot.blur]),
          listen(menuButton, "click", context[WheelSlot.menu]),
          actionDestroyer(
            longPress.call(null, menuButton, {
              duration: menuHoldMs,
            }),
          ),
          listen(menuButton, "longpress", context[WheelSlot.menuHold]),
          listen(backButton, "click", context[WheelSlot.back]),
          actionDestroyer(
            longPress.call(null, backButton, {
              duration: menuHoldMs,
              repeatInterval: buttonHoldMs,
            }),
          ),
          listen(backButton, "longpress", context[WheelSlot.backHold]),
          listen(forwardButton, "click", context[WheelSlot.forward]),
          actionDestroyer(
            longPress.call(null, forwardButton, {
              duration: menuHoldMs,
              repeatInterval: buttonHoldMs,
            }),
          ),
          listen(forwardButton, "longpress", context[WheelSlot.forwardHold]),
          listen(playButton, "click", context[WheelSlot.playPause]),
          actionDestroyer(
            (rotation = wheelRotation.call(null, scrollWheel, {
              excludeRadiusRatio: context[WheelSlot.innerRadius],
            })),
          ),
          listen(scrollWheel, "wheelscroll", context[WheelSlot.forwardScroll]),
          listen(scrollWheel, "wheeldragstart", context[WheelSlot.dragStart]),
          listen(scrollWheel, "wheeldragend", context[WheelSlot.dragEnd]),
          listen(scrollWheel, "pointerdown", context[WheelSlot.focusRing]),
          listen(selectButton, "click", context[WheelSlot.select]),
          actionDestroyer(
            (selectHold = longPress.call(null, selectButton, {
              duration: context[WheelSlot.duration] ?? menuHoldMs,
              keyboard: false,
              disabled: context[WheelSlot.duration] === null,
            })),
          ),
          listen(selectButton, "longpress", context[WheelSlot.selectHold]),
          listen(clickWheel, "keydown", context[WheelSlot.keydown]),
          listen(clickWheel, "keyup", context[WheelSlot.keyup]),
          listen(clickWheel, "focusout", context[WheelSlot.cancelKey]),
          listen(clickWheel, "pointerup", context[WheelSlot.pointerdown]),
        ];
        listening = true;
      }
    },
    update(nextContext: Context, dirty: number[]) {
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.translations) &&
          ariaLabelValue !==
            (ariaLabelValue = nextContext[WheelSlot.translations].t(
              "ASE.Web.IPod.Wheel.Menu",
            )))
      ) {
        attr(menuButton, "aria-label", ariaLabelValue);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          tabindexValue !==
            (tabindexValue = nextContext[WheelSlot.disabled] ? -1 : 0))
      ) {
        attr(menuButton, "tabindex", tabindexValue);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          ariaDisabledValue !==
            (ariaDisabledValue = nextContext[WheelSlot.disabled] || void 0))
      ) {
        attr(menuButton, "aria-disabled", ariaDisabledValue);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.translations) &&
          ariaLabelValue2 !==
            (ariaLabelValue2 = nextContext[WheelSlot.translations].t(
              "ASE.Web.IPod.Wheel.Back",
            )))
      ) {
        attr(backButton, "aria-label", ariaLabelValue2);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          tabindexValue2 !==
            (tabindexValue2 = nextContext[WheelSlot.disabled] ? -1 : 0))
      ) {
        attr(backButton, "tabindex", tabindexValue2);
      }
      if (
        !current ||
        (dirty[0] &
          ((1 << WheelSlot.disableSkip) | (1 << WheelSlot.disabled)) &&
          ariaDisabledValue2 !==
            (ariaDisabledValue2 =
              nextContext[WheelSlot.disabled] ||
              nextContext[WheelSlot.disableSkip]))
      ) {
        attr(backButton, "aria-disabled", ariaDisabledValue2);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.translations) &&
          ariaLabelValue3 !==
            (ariaLabelValue3 = nextContext[WheelSlot.translations].t(
              "ASE.Web.IPod.Wheel.Forward",
            )))
      ) {
        attr(forwardButton, "aria-label", ariaLabelValue3);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          tabindexValue3 !==
            (tabindexValue3 = nextContext[WheelSlot.disabled] ? -1 : 0))
      ) {
        attr(forwardButton, "tabindex", tabindexValue3);
      }
      if (
        !current ||
        (dirty[0] &
          ((1 << WheelSlot.disableSkip) | (1 << WheelSlot.disabled)) &&
          ariaDisabledValue3 !==
            (ariaDisabledValue3 =
              nextContext[WheelSlot.disabled] ||
              nextContext[WheelSlot.disableSkip]))
      ) {
        attr(forwardButton, "aria-disabled", ariaDisabledValue3);
      }
      if (
        !current ||
        (dirty[0] &
          ((1 << WheelSlot.isPlaying) | (1 << WheelSlot.translations)) &&
          ariaLabelValue4 !==
            (ariaLabelValue4 = nextContext[WheelSlot.translations].t(
              nextContext[WheelSlot.isPlaying]
                ? "ASE.Web.IPod.Wheel.Pause"
                : "ASE.Web.IPod.Wheel.Play",
            )))
      ) {
        attr(playButton, "aria-label", ariaLabelValue4);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          tabindexValue4 !==
            (tabindexValue4 = nextContext[WheelSlot.disabled] ? -1 : 0))
      ) {
        attr(playButton, "tabindex", tabindexValue4);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          ariaDisabledValue4 !==
            (ariaDisabledValue4 = nextContext[WheelSlot.disabled] || void 0))
      ) {
        attr(playButton, "aria-disabled", ariaDisabledValue4);
      }
      if (
        rotation &&
        isFunction(rotation.update) &&
        dirty[0] & (1 << WheelSlot.innerRadius)
      ) {
        rotation.update.call(null, {
          excludeRadiusRatio: nextContext[WheelSlot.innerRadius],
        });
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.translations) &&
          ariaLabelValue5 !==
            (ariaLabelValue5 = nextContext[WheelSlot.translations].t(
              "ASE.Web.IPod.Wheel.Select",
            )))
      ) {
        attr(selectButton, "aria-label", ariaLabelValue5);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          tabindexValue5 !==
            (tabindexValue5 = nextContext[WheelSlot.disabled] ? -1 : 0))
      ) {
        attr(selectButton, "tabindex", tabindexValue5);
      }
      if (
        !current ||
        (dirty[0] & (1 << WheelSlot.disabled) &&
          ariaDisabledValue5 !==
            (ariaDisabledValue5 = nextContext[WheelSlot.disabled] || void 0))
      ) {
        attr(selectButton, "aria-disabled", ariaDisabledValue5);
      }
      if (
        selectHold &&
        isFunction(selectHold.update) &&
        dirty[0] & (1 << WheelSlot.duration)
      ) {
        selectHold.update.call(null, {
          duration: nextContext[WheelSlot.duration] ?? menuHoldMs,
          keyboard: false,
          disabled: nextContext[WheelSlot.duration] === null,
        });
      }
      if (!current || dirty[0] & (1 << WheelSlot.dragging)) {
        toggleClass(clickWheel, "dragging", nextContext[WheelSlot.dragging]);
      }
      if (
        dirty[0] & (1 << WheelSlot.selectButtonDiameterPercent) &&
        selectDiameter !==
          (selectDiameter = `${nextContext[WheelSlot.selectButtonDiameterPercent]}%`)
      ) {
        setStyle(clickWheel, "--select-button-pct", selectDiameter);
      }
      if (
        dirty[0] & (1 << WheelSlot.scrollWheelDiameterPercent) &&
        wheelDiameter !==
          (wheelDiameter = `${nextContext[WheelSlot.scrollWheelDiameterPercent]}%`)
      ) {
        setStyle(clickWheel, "--scroll-wheel-pct", wheelDiameter);
      }
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(menuLabel.$$.fragment, local);
        transitionIn(playPauseIcon.$$.fragment, local);
        transitionIn(playPauseIcon2.$$.fragment, local);
        transitionIn(skipIcon.$$.fragment, local);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(menuLabel.$$.fragment, local);
      transitionOut(playPauseIcon.$$.fragment, local);
      transitionOut(playPauseIcon2.$$.fragment, local);
      transitionOut(skipIcon.$$.fragment, local);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(clickWheel);
      }
      destroyComponent(menuLabel);
      destroyComponent(playPauseIcon);
      destroyComponent(playPauseIcon2);
      destroyComponent(skipIcon);
      context[WheelSlot.bindRing](null);
      context[WheelSlot.bindWheel](null);
      listening = false;
      runAll(dispose);
    },
  };
}
function clickWheelInstance(
  component: Component<unknown[], WheelProps>,
  props: WheelProps,
  invalidate: Invalidate,
) {
  let innerRadius!: number,
    translations!: Model.I18n,
    { selectButtonDiameterPercent = wheelInnerDiameterPercent } = props,
    { scrollWheelDiameterPercent = wheelOuterDiameterPercent } = props,
    { disableSkip = false } = props,
    { disabled = false } = props,
    { scrollTarget = "list" } = props,
    { isPlaying = false } = props,
    { selectHoldMs: duration = null } = props;
  const i18n = useI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(WheelSlot.translations, (translations = value)),
  );
  let wheel!: HTMLDivElement,
    ring!: HTMLDivElement,
    dragging = false;
  const dispatch = createEventDispatcher(),
    logger = createLogger("<ClickWheel>");
  function pressButton(button: WheelButton) {
    if (!(disableSkip && (button === "back" || button === "forward"))) {
      logger.debug(`${button} button clicked`);
      dispatch(button);
    }
  }
  function holdButton(eventName: string, detail: Model.HeldSeekDetail) {
    if (!disableSkip) {
      dispatch(eventName, detail);
    }
  }
  function forwardScroll(event: CustomEvent<Model.WheelScrollDetail>) {
    dispatch("scroll", event.detail);
  }
  let heldKey!: string | undefined,
    keyAction!: WheelAction | undefined,
    holdStartedAt = 0,
    heldScrollTarget!: Model.ScrollTarget | undefined,
    heldSelectDuration: number | null = null;
  function dragStart() {
    invalidate(WheelSlot.dragging, (dragging = true));
    if (keyAction?.kind !== "scroll") {
      dispatch("dragstart");
    }
  }
  function dragEnd() {
    invalidate(WheelSlot.dragging, (dragging = false));
    if (keyAction?.kind !== "scroll") {
      dispatch("dragend");
    }
  }
  function actionForKey(key: string): WheelAction | undefined {
    var parent: HTMLElement | null, matchesRtl: boolean | undefined;
    switch (key) {
      case "ArrowUp":
      case "ArrowDown":
        return scrollTarget === "brick"
          ? {
              kind: "none",
            }
          : {
              kind: "scroll",
              step:
                key === (scrollTarget === "list" ? "ArrowDown" : "ArrowUp")
                  ? 1
                  : -1,
            };
      case "ArrowLeft":
      case "ArrowRight": {
        const value4 = key === "ArrowLeft",
          step = value4 ? -1 : 1;
        if (scrollTarget === "seek")
          return {
            kind: "scroll",
            step,
          };
        if (scrollTarget === "brick")
          return {
            kind: "steer",
            step,
          };
        if (scrollTarget === "volume")
          return {
            kind: "hold",
            button: value4 ? "back" : "forward",
            repeatInterval: buttonHoldMs,
          };
        const value5 =
          (matchesRtl =
            (parent = wheel.parentElement) === null || parent === void 0
              ? void 0
              : parent.matches(":dir(rtl)")) !== null && matchesRtl !== void 0
            ? matchesRtl
            : false;
        return {
          kind: "press",
          button: value4 !== value5 ? "menu" : "select",
        };
      }
      case "Enter":
        return duration === null
          ? {
              kind: "press",
              button: "select",
            }
          : {
              kind: "hold",
              button: "select",
              duration,
            };
      case " ":
        return {
          kind: "press",
          button: "playpause",
        };
      case "Escape":
        return {
          kind: "hold",
          button: "menu",
        };
      default:
        return;
    }
  }
  function keyScroll(step: number) {
    dispatch("keyscroll", {
      step,
      heldMs: performance.now() - holdStartedAt,
    });
  }
  function repeatHeldAction(repeat: boolean) {
    if (scrollTarget !== heldScrollTarget || duration !== heldSelectDuration) {
      releaseKey(false);
    } else if (keyAction?.kind === "scroll") {
      keyScroll(keyAction.step);
    } else if (keyAction?.kind === "hold") {
      if (keyAction.button === "menu") {
        dispatch("menuhold");
      } else if (keyAction.button === "select") {
        dispatch("selecthold");
      } else {
        holdButton(`${keyAction.button}hold`, {
          repeat,
        });
      }
    }
  }
  const holdTimer = createHoldTimer(repeatHeldAction);
  function releaseKey(commitPress: boolean) {
    const action = keyAction,
      held = holdTimer.stop();
    heldKey = void 0;
    keyAction = void 0;
    if (action?.kind === "scroll") {
      if (!dragging) {
        dispatch("dragend");
      }
    } else if (action?.kind === "steer") {
      dispatch("steer", null);
    } else if (action && action.kind !== "none" && commitPress && !held) {
      pressButton(action.button);
    }
  }
  function keydown(event: KeyboardEvent) {
    var holdDuration: number | undefined;
    if (event.target !== ring) return;
    if (event.ctrlKey || event.metaKey || event.altKey) {
      releaseKey(false);
      return;
    }
    const action = actionForKey(event.key);
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      if (!(event.repeat || event.key === heldKey)) {
        releaseKey(false);
        heldKey = event.key;
        keyAction = action;
        holdStartedAt = performance.now();
        heldScrollTarget = scrollTarget;
        heldSelectDuration = duration;
        if (action.kind === "scroll") {
          if (!dragging) {
            dispatch("dragstart");
          }
          keyScroll(action.step);
          holdTimer.start(keyRepeatDelayMs, keyRepeatIntervalMs);
        } else if (action.kind === "steer") {
          dispatch("steer", action.step);
        } else if (action.kind === "hold") {
          holdTimer.start(
            (holdDuration = action.duration) !== null && holdDuration !== void 0
              ? holdDuration
              : menuHoldMs,
            action.repeatInterval,
          );
        }
      }
    }
  }
  function keyup(event: KeyboardEvent) {
    if (event.key === heldKey) {
      event.preventDefault();
      event.stopPropagation();
      releaseKey(true);
    }
  }
  function focusRing() {
    if (window.matchMedia("(any-pointer: fine)").matches) {
      ring.focus({
        preventScroll: true,
      });
    }
  }
  function pointerdown(event: PointerEvent) {
    if (
      event.pointerType === "mouse" &&
      (event.width > 0 || event.height > 0)
    ) {
      focusRing();
    }
  }
  onDestroy(() => {
    holdTimer.stop();
  });
  const blur = () => releaseKey(false),
    menu = () => pressButton("menu"),
    menuHold = () => dispatch("menuhold"),
    back = () => pressButton("back"),
    backHold = (value: CustomEvent<Model.HeldSeekDetail>) =>
      holdButton("backhold", value.detail),
    forward = () => pressButton("forward"),
    forwardHold = (value: CustomEvent<Model.HeldSeekDetail>) =>
      holdButton("forwardhold", value.detail),
    playPause = () => pressButton("playpause");
  function bindRing(node: HTMLDivElement | null) {
    bindingCallbacks[node ? "unshift" : "push"](() => {
      ring = node!;
      invalidate(WheelSlot.ring, ring);
    });
  }
  const select = () => pressButton("select"),
    selectHold = () => dispatch("selecthold");
  function bindWheel(node: HTMLDivElement | null) {
    bindingCallbacks[node ? "unshift" : "push"](() => {
      wheel = node!;
      invalidate(WheelSlot.wheel, wheel);
    });
  }
  const cancelKey = () => releaseKey(false);
  component.$$set = (value) => {
    if ("selectButtonDiameterPercent" in value) {
      invalidate(
        WheelSlot.selectButtonDiameterPercent,
        (selectButtonDiameterPercent = value.selectButtonDiameterPercent!),
      );
    }
    if ("scrollWheelDiameterPercent" in value) {
      invalidate(
        WheelSlot.scrollWheelDiameterPercent,
        (scrollWheelDiameterPercent = value.scrollWheelDiameterPercent!),
      );
    }
    if ("disableSkip" in value) {
      invalidate(WheelSlot.disableSkip, (disableSkip = value.disableSkip!));
    }
    if ("disabled" in value) {
      invalidate(WheelSlot.disabled, (disabled = value.disabled!));
    }
    if ("scrollTarget" in value) {
      invalidate(WheelSlot.scrollTarget, (scrollTarget = value.scrollTarget!));
    }
    if ("isPlaying" in value) {
      invalidate(WheelSlot.isPlaying, (isPlaying = value.isPlaying!));
    }
    if ("selectHoldMs" in value) {
      invalidate(WheelSlot.duration, (duration = value.selectHoldMs!));
    }
  };
  component.$$.update = () => {
    if (
      component.$$.dirty[0] &
      ((1 << WheelSlot.selectButtonDiameterPercent) |
        (1 << WheelSlot.scrollWheelDiameterPercent))
    ) {
      invalidate(
        WheelSlot.innerRadius,
        (innerRadius =
          selectButtonDiameterPercent / scrollWheelDiameterPercent),
      );
    }
  };
  return [
    selectButtonDiameterPercent,
    scrollWheelDiameterPercent,
    disableSkip,
    disabled,
    isPlaying,
    duration,
    wheel,
    ring,
    dragging,
    innerRadius,
    translations,
    i18n,
    dispatch,
    pressButton,
    holdButton,
    forwardScroll,
    dragStart,
    dragEnd,
    releaseKey,
    keydown,
    keyup,
    focusRing,
    pointerdown,
    scrollTarget,
    blur,
    menu,
    menuHold,
    back,
    backHold,
    forward,
    forwardHold,
    playPause,
    bindRing,
    select,
    selectHold,
    bindWheel,
    cancelKey,
  ] satisfies [unknown, ...unknown[]];
}
class ClickWheel extends SvelteComponent<Context, WheelProps> {
  constructor(options: ComponentOptions<WheelProps>) {
    super();
    initComponent(
      this,
      options,
      clickWheelInstance,
      renderClickWheel,
      safeNotEqual,
      {
        selectButtonDiameterPercent: WheelSlot.selectButtonDiameterPercent,
        scrollWheelDiameterPercent: WheelSlot.scrollWheelDiameterPercent,
        disableSkip: WheelSlot.disableSkip,
        disabled: WheelSlot.disabled,
        scrollTarget: WheelSlot.scrollTarget,
        isPlaying: WheelSlot.isPlaying,
        selectHoldMs: WheelSlot.duration,
      },
      wheelStyles,
      [-1, -1],
    );
  }
  get selectButtonDiameterPercent() {
    return this.$$.ctx[WheelSlot.selectButtonDiameterPercent]!;
  }
  set selectButtonDiameterPercent(
    selectButtonDiameterPercent: WheelProps["selectButtonDiameterPercent"],
  ) {
    this.$$set!({
      selectButtonDiameterPercent,
    });
    flush();
  }
  get scrollWheelDiameterPercent() {
    return this.$$.ctx[WheelSlot.scrollWheelDiameterPercent]!;
  }
  set scrollWheelDiameterPercent(
    scrollWheelDiameterPercent: WheelProps["scrollWheelDiameterPercent"],
  ) {
    this.$$set!({
      scrollWheelDiameterPercent,
    });
    flush();
  }
  get disableSkip() {
    return this.$$.ctx[WheelSlot.disableSkip]!;
  }
  set disableSkip(disableSkip: WheelProps["disableSkip"]) {
    this.$$set!({
      disableSkip,
    });
    flush();
  }
  get disabled() {
    return this.$$.ctx[WheelSlot.disabled]!;
  }
  set disabled(disabled: WheelProps["disabled"]) {
    this.$$set!({
      disabled,
    });
    flush();
  }
  get scrollTarget() {
    return this.$$.ctx[WheelSlot.scrollTarget]!;
  }
  set scrollTarget(scrollTarget: WheelProps["scrollTarget"]) {
    this.$$set!({
      scrollTarget,
    });
    flush();
  }
  get isPlaying() {
    return this.$$.ctx[WheelSlot.isPlaying]!;
  }
  set isPlaying(isPlaying: WheelProps["isPlaying"]) {
    this.$$set!({
      isPlaying,
    });
    flush();
  }
  get selectHoldMs() {
    return this.$$.ctx[WheelSlot.duration]!;
  }
  set selectHoldMs(selectHoldMs: WheelProps["selectHoldMs"]) {
    this.$$set!({
      selectHoldMs,
    });
    flush();
  }
}
createSvelteCustomElement(
  ClickWheel,
  {
    selectButtonDiameterPercent: {},
    scrollWheelDiameterPercent: {},
    disableSkip: {
      type: "Boolean",
    },
    disabled: {
      type: "Boolean",
    },
    scrollTarget: {},
    isPlaying: {
      type: "Boolean",
    },
    selectHoldMs: {},
  },
  [],
  [],
  true,
);
export { ClickWheel };
