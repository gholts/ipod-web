import type * as Model from "../types.js";
// Click-wheel rotation, hold/keyboard input, acceleration, and screen transitions.
import {
  heldSeekSteps,
  maxAccelerationSpeed,
  maxMeasuredSpeed,
  menuHoldMs,
  speedSmoothing,
  volumeClickDegrees,
  volumeStepDegrees,
} from "./settings.js";
import { playerRepeatModes } from "./playback.js";
function speedPerSecond(distance: number, elapsedMs: number) {
  return elapsedMs > 0 ? (distance / elapsedMs) * 1e3 : 0;
}
function measureSpeed(
  timestamp: number,
  previousTimestamp: number | undefined,
  distance: number,
) {
  const elapsedMs =
    previousTimestamp !== void 0 ? timestamp - previousTimestamp : 0;
  return Math.min(speedPerSecond(distance, elapsedMs), maxMeasuredSpeed);
}
function accelerationTier(config: AccelerationConfig, heldMs: number) {
  const tier = Math.min(
    config.tiers.length - 1,
    Math.floor(heldMs / config.tierMs),
  );
  return config.tiers[tier];
}
const accelerationIdleMs = 250;
function createAcceleration(config: AccelerationConfig) {
  let smoothedSpeed = 0,
    previousDirection: number | undefined,
    lastEventAt: number | undefined,
    acceleratingSince: number | undefined;
  function reset() {
    smoothedSpeed = 0;
    previousDirection = void 0;
    lastEventAt = void 0;
    acceleratingSince = void 0;
  }
  function next(speed: number, direction: number, active: boolean) {
    if (!active) {
      reset();
      return config.tiers[0];
    }
    const timestamp = performance.now(),
      idle =
        lastEventAt !== void 0 && timestamp - lastEventAt > accelerationIdleMs;
    lastEventAt = timestamp;
    const cappedSpeed = Math.min(speed, maxAccelerationSpeed);
    if (direction !== previousDirection || idle) {
      smoothedSpeed = cappedSpeed;
      previousDirection = direction;
      acceleratingSince = void 0;
    } else {
      smoothedSpeed += speedSmoothing * (cappedSpeed - smoothedSpeed);
    }
    return smoothedSpeed <= config.minSpeed
      ? ((acceleratingSince = void 0), config.tiers[0])
      : (acceleratingSince ?? (acceleratingSince = timestamp),
        accelerationTier(config, timestamp - acceleratingSince));
  }
  return {
    next,
    reset,
  };
}
function volumeToPercent(volume: number) {
  return Math.round(volume * 100);
}
function volumeFromPercent(percent: number) {
  return percent / 100;
}
function createIdleTimer(delayMs: number, callback: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function stop() {
    clearTimeout(timeout);
    timeout = void 0;
  }
  function start() {
    stop();
    timeout = setTimeout(() => {
      timeout = void 0;
      callback();
    }, delayMs);
  }
  function flush() {
    if (timeout !== void 0) {
      stop();
      callback();
    }
  }
  return {
    start,
    stop,
    flush,
    destroy: stop,
  };
}
function createHoldTimer(callback: (repeat: boolean) => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined,
    interval: ReturnType<typeof setInterval> | undefined,
    held = false;
  function clearTimers() {
    clearTimeout(timeout);
    clearInterval(interval);
    timeout = void 0;
    interval = void 0;
  }
  function stop() {
    clearTimers();
    const wasHeld = held;
    held = false;
    return wasHeld;
  }
  function start(delayMs: number, repeatMs?: number) {
    stop();
    timeout = setTimeout(() => {
      timeout = void 0;
      held = true;
      callback(false);
      if (held && repeatMs !== void 0) {
        interval = setInterval(() => callback(true), repeatMs);
      }
    }, delayMs);
  }
  return {
    start,
    stop,
  };
}
const navigationKeys = /* @__PURE__ */ new Set([
    "ArrowDown",
    "ArrowUp",
    "ArrowRight",
    "ArrowLeft",
    "Enter",
    " ",
    "Escape",
  ]),
  inputKeys = /* @__PURE__ */ new Set([
    "ArrowDown",
    "ArrowUp",
    "ArrowRight",
    "ArrowLeft",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ]);
function consumeEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}
const keyboardNavigation = (
  node: HTMLElement,
  initialOptions: KeyboardOptions,
) => {
  let options = initialOptions;
  const menuHold = createHoldTimer(() => options.onMenuHold());
  let menuPressed = false;
  function cancelHold() {
    menuPressed = false;
    menuHold.stop();
  }
  function pressMenu(event: KeyboardEvent) {
    consumeEvent(event);
    if (!event.repeat) {
      menuPressed = true;
      menuHold.start(menuHoldMs);
    }
  }
  function keydown(event: KeyboardEvent) {
    if (options.mode !== "passthrough") {
      if (options.disabled) {
        if (navigationKeys.has(event.key) || inputKeys.has(event.key)) {
          consumeEvent(event);
        }
        return;
      }
      if (options.mode === "now-playing" && event.key !== "Escape") {
        const inputNavigation =
            event.target instanceof HTMLInputElement &&
            inputKeys.has(event.key),
          linkActivation =
            event.target instanceof HTMLAnchorElement && event.key === "Enter",
          nativeAction = inputNavigation || linkActivation;
        if (nativeAction || navigationKeys.has(event.key)) {
          event.stopPropagation();
          if (!nativeAction) {
            event.preventDefault();
          }
        }
        return;
      }
      switch (event.key) {
        case "ArrowDown":
          consumeEvent(event);
          options.onArrow(event, 1);
          break;
        case "ArrowUp":
          consumeEvent(event);
          options.onArrow(event, -1);
          break;
        case "ArrowRight":
        case "ArrowLeft":
          consumeEvent(event);
          break;
        case "Enter":
        case " ":
          consumeEvent(event);
          if (!event.repeat) {
            options.onSelect();
          }
          break;
        case "Escape":
          pressMenu(event);
          break;
      }
    }
  }
  function keyup(event: KeyboardEvent) {
    if (!(event.key !== "Escape" || !menuPressed)) {
      menuPressed = false;
      if (!menuHold.stop()) {
        options.onBack();
      }
    }
  }
  node.addEventListener("keydown", keydown);
  node.addEventListener("keyup", keyup);
  node.addEventListener("focusout", cancelHold);
  window.addEventListener("blur", cancelHold);
  return {
    update(r: KeyboardOptions) {
      const c = r.navigationId !== options.navigationId;
      options = r;
      if (options.disabled || c) {
        cancelHold();
      }
    },
    destroy() {
      node.removeEventListener("keydown", keydown);
      node.removeEventListener("keyup", keyup);
      node.removeEventListener("focusout", cancelHold);
      window.removeEventListener("blur", cancelHold);
      cancelHold();
    },
  };
};
function sineInOut(progress: number) {
  return -0.5 * (Math.cos(Math.PI * progress) - 1);
}
function sineOut(progress: number) {
  return Math.sin((progress * Math.PI) / 2);
}
const screenSlideMs = 240,
  screenTransitions: WeakMap<HTMLElement, ScreenTransition> =
    /* @__PURE__ */ new WeakMap(),
  outgoingScreens: WeakMap<
    HTMLElement,
    Map<number, ScreenTransition[]>
  > = /* @__PURE__ */ new WeakMap();
function outgoingScreensInDirection(
  parent: HTMLElement,
  direction: number,
): ScreenTransition[] {
  const directions: Map<number, ScreenTransition[]> =
      outgoingScreens.get(parent) ?? /* @__PURE__ */ new Map(),
    screens = directions.get(direction) ?? [];
  directions.set(direction, screens);
  outgoingScreens.set(parent, directions);
  return screens;
}
function transitionPosition(transition?: ScreenTransition) {
  if (!transition || transition.duration <= 0) return;
  const progress =
    (performance.now() - transition.startedAt) / transition.duration;
  if (!(progress >= 1))
    return (
      transition.from +
      (transition.to - transition.from) * transition.easing(progress)
    );
}
function translateX(node: HTMLElement) {
  const { transform } = getComputedStyle(node);
  if (
    !(!transform || transform === "none") &&
    !(typeof DOMMatrixReadOnly > "u")
  )
    try {
      return new DOMMatrixReadOnly(transform).m41;
    } catch {
      return;
    }
}
function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function slideScreen(
  node: HTMLElement,
  {
    back = false,
  }: {
    back?: boolean;
  },
  transition: {
    direction: string;
  },
) {
  const parent = node.parentElement,
    width = (parent == null ? void 0 : parent.clientWidth) ?? 0;
  if (reducedMotion() || width === 0)
    return {
      duration: 0,
    };
  const rtl = node.matches(":dir(rtl)"),
    entryX = (back === rtl ? 1 : -1) * width;
  if (transition.direction !== "out") {
    const outgoing = parent
        ? outgoingScreensInDirection(parent, Math.sign(entryX)).pop()
        : void 0,
      position = transitionPosition(outgoing),
      interruptedX =
        position !== void 0 && outgoing != null && outgoing.node
          ? (translateX(outgoing.node) ?? position)
          : position;
    if (outgoing != null && outgoing.node) {
      outgoing.node.style.display = "none";
    }
    const from = interruptedX ?? entryX,
      intro = {
        node,
        startedAt: performance.now(),
        from,
        to: 0,
        // Hold the speed, not the duration, so a pickup does not crawl.
        duration: screenSlideMs * (Math.abs(from) / width),
        // Already moving when picked up, so easing in again would stutter.
        easing: interruptedX === void 0 ? sineInOut : sineOut,
      };
    screenTransitions.set(node, intro);
    return {
      duration: intro.duration,
      easing: intro.easing,
      css: (M: number, y: number) => `transform: translateX(${from * y}px)`,
    };
  }
  const from = transitionPosition(screenTransitions.get(node)) ?? 0;
  screenTransitions.delete(node);
  const exitX = -entryX,
    outro = {
      node,
      startedAt: performance.now(),
      from,
      to: exitX,
      // Capped so a screen caught at the far edge does not crawl.
      duration: screenSlideMs * Math.min(1, Math.abs(exitX - from) / width),
      easing: from === 0 ? sineInOut : sineOut,
    };
  if (parent) {
    const outgoing = outgoingScreensInDirection(parent, Math.sign(exitX));
    outgoing.forEach((d) => {
      if (transitionPosition(d) === void 0) {
        d.node = void 0;
      }
    });
    outgoing.push(outro);
  }
  return {
    duration: outro.duration,
    easing: outro.easing,
    // Svelte counts the outro's second arg up from 0, unlike the intro's.
    // _t in this case is Svelte's per-direction easing fraction, which we don't
    // use because our math is built on its complement.
    css: (c: number, d: number) =>
      `transform: translateX(${from + (exitX - from) * d}px)`,
  };
}
function excludeRadiusRatio(options?: { excludeRadiusRatio?: number }) {
  return (options == null ? void 0 : options.excludeRadiusRatio) ?? 0;
}
const wheelReversalDegrees = 8,
  wheelCenterGuardRatio = 0.1;
function angleDegrees({ x, y }: Point) {
  return (Math.atan2(y, x) * 180) / Math.PI;
}
function angleDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}
function direction(delta: number) {
  return delta > 0 ? 1 : -1;
}
function segmentDistanceSquared(start: Point, end: Point) {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    lengthSquared = dx * dx + dy * dy,
    fraction =
      lengthSquared === 0
        ? 0
        : Math.min(
            1,
            Math.max(0, -(start.x * dx + start.y * dy) / lengthSquared),
          ),
    closestX = start.x + fraction * dx,
    closestY = start.y + fraction * dy;
  return closestX * closestX + closestY * closestY;
}
const wheelRotation = (
    node: HTMLElement,
    options?: {
      excludeRadiusRatio?: number;
    },
  ) => {
    let excludedRadius = excludeRadiusRatio(options),
      pointerId: number | undefined,
      previousOffset: Point | undefined,
      previousTimestamp: number | undefined,
      previousDirection: number | undefined,
      reverseDegrees = 0;
    function pointerPosition(event: PointerEvent) {
      const bounds = node.getBoundingClientRect(),
        centerX = bounds.left + bounds.width / 2,
        centerY = bounds.top + bounds.height / 2,
        radius = Math.min(bounds.width, bounds.height) / 2,
        innerRadius = radius * excludedRadius,
        x = event.clientX - centerX,
        y = event.clientY - centerY,
        distanceSquared = x * x + y * y;
      return {
        offset: {
          x,
          y,
        },
        radius,
        withinWheel:
          // The `+ 1e-6` absorbs floating-point rounding so a point
          // sitting exactly on the outer edge isn't excluded by a hair.
          distanceSquared <= radius * radius + 1e-6 &&
          distanceSquared >= innerRadius * innerRadius,
      };
    }
    function pointerdown(event: PointerEvent) {
      var setCapture;
      if (pointerId !== void 0) return;
      const { offset, withinWheel } = pointerPosition(event);
      if (withinWheel) {
        pointerId = event.pointerId;
        previousOffset = offset;
        previousTimestamp = event.timeStamp;
        if (!((setCapture = node.setPointerCapture) == null)) {
          setCapture.call(node, pointerId);
        }
        node.dispatchEvent(new CustomEvent("wheeldragstart"));
      }
    }
    function pointermove(event: PointerEvent) {
      if (
        pointerId !== event.pointerId ||
        previousOffset === void 0 ||
        previousTimestamp === void 0
      )
        return;
      const { offset, radius } = pointerPosition(event),
        centerGuard = radius * wheelCenterGuardRatio,
        previous = previousOffset,
        elapsedMs = event.timeStamp - previousTimestamp;
      previousOffset = offset;
      previousTimestamp = event.timeStamp;
      if (segmentDistanceSquared(previous, offset) < centerGuard * centerGuard)
        return;
      const delta = angleDelta(angleDegrees(previous), angleDegrees(offset));
      if (delta === 0) return;
      const step = direction(delta),
        degrees = Math.abs(delta);
      if (previousDirection === void 0 || step === previousDirection) {
        previousDirection = step;
        reverseDegrees = 0;
      } else {
        reverseDegrees += degrees;
        if (reverseDegrees < wheelReversalDegrees) return;
        previousDirection = step;
        reverseDegrees = 0;
      }
      const speed = speedPerSecond(degrees, elapsedMs),
        detail = {
          step: previousDirection,
          degrees,
          speed,
        };
      node.dispatchEvent(
        new CustomEvent("wheelscroll", {
          detail,
        }),
      );
    }
    function pointerup(event: PointerEvent) {
      var releaseCapture;
      if (pointerId === event.pointerId) {
        if (!((releaseCapture = node.releasePointerCapture) == null)) {
          releaseCapture.call(node, pointerId);
        }
        pointerId = void 0;
        previousOffset = void 0;
        previousTimestamp = void 0;
        previousDirection = void 0;
        reverseDegrees = 0;
        node.dispatchEvent(new CustomEvent("wheeldragend"));
      }
    }
    node.addEventListener("pointerdown", pointerdown);
    node.addEventListener("pointermove", pointermove);
    node.addEventListener("pointerup", pointerup);
    node.addEventListener("pointercancel", pointerup);
    node.addEventListener("lostpointercapture", pointerup);
    return {
      update(A?: { excludeRadiusRatio?: number }) {
        excludedRadius = excludeRadiusRatio(A);
      },
      destroy() {
        node.removeEventListener("pointerdown", pointerdown);
        node.removeEventListener("pointermove", pointermove);
        node.removeEventListener("pointerup", pointerup);
        node.removeEventListener("pointercancel", pointerup);
        node.removeEventListener("lostpointercapture", pointerup);
      },
    };
  },
  activationKeys = ["Enter", " "],
  longPress = (node: HTMLElement, initialOptions: HoldOptions) => {
    let options = initialOptions,
      pointerId: number | undefined,
      pressedKey: string | undefined,
      suppressClick = false;
    const holdTimer = createHoldTimer((repeat) => {
      if (pointerId !== void 0) {
        suppressClick = true;
      }
      node.dispatchEvent(
        new CustomEvent("longpress", {
          detail: {
            repeat,
          },
        }),
      );
    });
    function pressed() {
      return pointerId !== void 0 || pressedKey !== void 0;
    }
    function start() {
      suppressClick = false;
      holdTimer.start(options.duration, options.repeatInterval);
    }
    function cancel() {
      holdTimer.stop();
      pointerId = void 0;
      pressedKey = void 0;
    }
    function pointerdown(I: PointerEvent) {
      var x;
      if (!(options.disabled || !I.isPrimary || I.button !== 0 || pressed())) {
        pointerId = I.pointerId;
        if ((x = node.hasPointerCapture) != null && x.call(node, I.pointerId)) {
          node.releasePointerCapture(I.pointerId);
        }
        start();
      }
    }
    function pointerup(I: PointerEvent) {
      if (I.pointerId === pointerId) {
        pointerId = void 0;
        holdTimer.stop();
      }
    }
    function pointercancel(I: PointerEvent) {
      if (I.pointerId === pointerId) {
        cancel();
      }
    }
    function contextmenu(I: MouseEvent) {
      if (pointerId !== void 0) {
        I.preventDefault();
      }
    }
    function keydown(I: KeyboardEvent) {
      if (!(
        options.disabled ||
        options.keyboard === false ||
        !activationKeys.includes(I.key)
      )) {
        I.preventDefault();
        if (!(I.repeat || pressed())) {
          pressedKey = I.key;
          start();
        }
      }
    }
    function keyup(I: KeyboardEvent) {
      if (!(
        options.disabled ||
        options.keyboard === false ||
        !activationKeys.includes(I.key)
      )) {
        I.preventDefault();
        if (I.key === pressedKey) {
          pressedKey = void 0;
          if (!holdTimer.stop()) {
            node.click();
          }
        }
      }
    }
    function blur() {
      if (pressedKey !== void 0) {
        cancel();
      }
    }
    function clearSuppression() {
      suppressClick = false;
    }
    function suppressHeldClick(I: MouseEvent) {
      if (!suppressClick) return;
      const [x] = I.composedPath();
      if (!(!(x instanceof Node) || !(node.contains(x) || x.contains(node)))) {
        suppressClick = false;
        I.stopImmediatePropagation();
        I.preventDefault();
      }
    }
    node.addEventListener("pointerdown", pointerdown);
    node.addEventListener("pointerup", pointerup);
    node.addEventListener("pointercancel", pointercancel);
    node.addEventListener("pointerleave", pointercancel);
    node.addEventListener("contextmenu", contextmenu);
    node.addEventListener("keydown", keydown);
    node.addEventListener("keyup", keyup);
    node.addEventListener("blur", blur);
    window.addEventListener("blur", cancel);
    window.addEventListener("pointerdown", clearSuppression, true);
    window.addEventListener("click", suppressHeldClick, true);
    return {
      update(I: HoldOptions) {
        options = I;
        if (options.disabled) {
          cancel();
        }
      },
      destroy() {
        cancel();
        node.removeEventListener("pointerdown", pointerdown);
        node.removeEventListener("pointerup", pointerup);
        node.removeEventListener("pointercancel", pointercancel);
        node.removeEventListener("pointerleave", pointercancel);
        node.removeEventListener("contextmenu", contextmenu);
        node.removeEventListener("keydown", keydown);
        node.removeEventListener("keyup", keyup);
        node.removeEventListener("blur", blur);
        window.removeEventListener("blur", cancel);
        window.removeEventListener("pointerdown", clearSuppression, true);
        window.removeEventListener("click", suppressHeldClick, true);
      },
    };
  },
  wheelTextureUrl = new URL("../assets/wheel-texture.png", import.meta.url)
    .href;
function playerRepeatMode(mode: Model.RepeatMode) {
  return playerRepeatModes[mode];
}
function wholeSteps(distance: number, stepSize: number) {
  const count = Math.floor(distance / stepSize);
  return {
    count,
    remainder: distance - count * stepSize,
  };
}
function createWheelScroll({
  move,
  click,
}: {
  move: (step: number, count: number) => boolean;
  click: (count: number, target: Model.ScrollTarget) => void;
}) {
  let degrees = 0,
    previousStep: number | undefined,
    previousVolume: boolean | undefined,
    clickDegrees = 0,
    volumeMoved = false;
  function reset() {
    degrees = 0;
    clickDegrees = 0;
    volumeMoved = false;
  }
  function scrollVolume(step: number, distance: number) {
    const movement = wholeSteps(degrees, volumeStepDegrees);
    degrees = movement.remainder;
    if (movement.count >= 1) {
      const moved = move(step, movement.count);
      volumeMoved = volumeMoved || moved;
    }
    const clicks = wholeSteps(clickDegrees + distance, volumeClickDegrees);
    clickDegrees = clicks.remainder;
    if (clicks.count >= 1) {
      if (volumeMoved) {
        click(clicks.count, "volume");
      }
      volumeMoved = false;
    }
  }
  function scroll({
    step,
    degrees: distance,
    target,
    multiplier,
    dragStepDegrees,
  }: {
    step: number;
    degrees: number;
    target: Model.ScrollTarget;
    multiplier: number;
    dragStepDegrees: number;
  }) {
    const isVolume = target === "volume";
    if (step !== previousStep || isVolume !== previousVolume) {
      previousStep = step;
      previousVolume = isVolume;
      reset();
    }
    degrees += distance;
    if (isVolume) {
      scrollVolume(step, distance);
      return;
    }
    const { count, remainder } = wholeSteps(degrees, dragStepDegrees);
    degrees = remainder;
    if (!(count < 1) && move(step, count * multiplier)) {
      click(count, target);
    }
  }
  return {
    scroll,
    reset,
  };
}
function createHeldSeek() {
  let seekTime: number | undefined,
    trackIndex: number | undefined,
    repeats = 0;
  function step(
    direction: number,
    repeat: boolean,
    {
      isInert,
      isSeeking,
      hasLoadedItem,
      currentTrackIndex,
      currentPlaybackTime,
      currentPlaybackDuration,
    }: Pick<
      Model.PlaybackState,
      | "hasLoadedItem"
      | "currentTrackIndex"
      | "currentPlaybackTime"
      | "currentPlaybackDuration"
    > & {
      isInert: boolean;
      isSeeking: boolean;
    },
  ) {
    if (!repeat) {
      seekTime = isInert ? void 0 : currentPlaybackTime;
      trackIndex = currentTrackIndex;
      repeats = 0;
    }
    if (
      seekTime === void 0 ||
      isInert ||
      isSeeking ||
      !hasLoadedItem ||
      currentPlaybackDuration <= 0 ||
      currentTrackIndex !== trackIndex
    )
      return;
    const stepSeconds =
        heldSeekSteps[Math.min(repeats, heldSeekSteps.length - 1)],
      nextTime = Math.min(
        Math.max(seekTime + direction * stepSeconds, 0),
        currentPlaybackDuration,
      );
    repeats += 1;
    seekTime =
      nextTime > 0 && nextTime < currentPlaybackDuration ? nextTime : void 0;
    return nextTime;
  }
  function cancel() {
    seekTime = void 0;
  }
  return {
    step,
    cancel,
  };
}
export {
  accelerationTier,
  createAcceleration,
  createHeldSeek,
  createHoldTimer,
  createIdleTimer,
  createWheelScroll,
  keyboardNavigation,
  longPress,
  measureSpeed,
  playerRepeatMode,
  slideScreen,
  volumeFromPercent,
  volumeToPercent,
  wheelRotation,
  wheelTextureUrl,
};
interface AccelerationConfig {
  minSpeed: number;
  tierMs: number;
  tiers: number[];
}
interface KeyboardOptions {
  mode: string;
  disabled: boolean;
  navigationId: number;
  onMenuHold(): void;
  onArrow(event: KeyboardEvent, step: number): void;
  onSelect(): void;
  onBack(): void;
}
interface Point {
  x: number;
  y: number;
}
interface HoldOptions {
  duration: number;
  repeatInterval?: number;
  disabled?: boolean;
  keyboard?: boolean;
}
interface ScreenTransition {
  node?: HTMLElement;
  startedAt: number;
  from: number;
  to: number;
  duration: number;
  easing: (progress: number) => number;
}
