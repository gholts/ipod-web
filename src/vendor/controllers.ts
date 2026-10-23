import { DeviceSlot, MenuSlot } from "./slots.js";
import type { Component, Invalidate } from "./runtime-types.js";
import type {
  MenuProps,
  DeviceProps,
  BrickHandle,
  MenuHandle,
} from "./view-types.js";
import type * as Model from "../types.js";
// Menu and device controllers; numeric invalidation slots connect original compiled views.
import {
  clickSoundUrl,
  closeAudioOnDestroy,
  createAudioContext,
  createCatalogStore,
  createClickSound,
  createPlaybackStore,
  playbackAllowed,
  resumeAudio,
  runUntilDestroyed,
} from "./playback.js";
import { createLogger } from "./environment.js";
import {
  onMount,
  bindingCallbacks,
  createEventDispatcher,
  noop,
  onDestroy,
  subscribe,
  subscribeComponent,
} from "./runtime.js";
import {
  ClickerMode,
  ShuffleMode,
  createBacklight,
  defaultDragStepDegrees,
  defaultLocale,
  keySeekStepSeconds,
  keyboardStepDegrees,
  listAcceleration,
  nowPlayingIdleDelayMs,
  onSettingsReset,
  paddleTurnDegrees,
  resetSettings,
  setBacklight,
  settings,
  startupMaxHoldMs,
  startupMinDisplayMs,
  volumeSaveDelayMs,
} from "./settings.js";
import {
  accelerationTier,
  createAcceleration,
  createHeldSeek,
  createIdleTimer,
  createWheelScroll,
  measureSpeed,
  playerRepeatMode,
  volumeFromPercent,
  volumeToPercent,
} from "./input.js";
import {
  createI18n,
  isSongScreen,
  playableRows,
  playingRowIndex,
  provideI18n,
  queueFromRows,
  screenSongs,
  useI18n,
} from "./i18n.js";
import {
  createSeekController,
  createSelectionMemory,
  createVolumeController,
  listsNowPlaying,
  screenDefinition,
  screenItems,
  screenTitle,
} from "./navigation.js";
const nowPlayingScreenKey = "now-playing";
function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return active;
}
function last<T>(value: T[]) {
  return value[value.length - 1];
}
function nowPlayingScreen(): Model.ScreenState {
  return {
    key: "now-playing",
  };
}
function menuInstance(
  component: Component<unknown[], MenuProps>,
  props: MenuProps,
  invalidate: Invalidate,
) {
  let hasNowPlaying!: boolean,
    currentScreen!: Model.ScreenState,
    view!: "list" | "now-playing" | "brick",
    title!: string,
    currentHasNowPlaying!: boolean | undefined,
    currentItems!: Model.MenuRow[],
    currentSong: Model.Song | undefined,
    idleJumpArmed!: boolean,
    keyboardMode!: "list" | "now-playing" | "passthrough",
    playbackState!: Model.PlaybackState,
    unsubscribePlayback = noop,
    watchPlayback = () => {
      unsubscribePlayback();
      unsubscribePlayback = subscribe(playback, (value) =>
        invalidate(MenuSlot.playbackState, (playbackState = value)),
      );
    },
    currentSettings!: Model.Settings,
    translations!: Model.I18n,
    volumeState!: {
      isAdjustingVolume: boolean;
    },
    unsubscribeVolume = noop,
    watchVolume = () => {
      unsubscribeVolume();
      unsubscribeVolume = subscribe(volumeController, (value) =>
        invalidate(MenuSlot.volumeState, (volumeState = value)),
      );
    },
    seekState!: {
      isSeeking: boolean;
      seekPreviewTime?: number;
    },
    unsubscribeSeek = noop,
    watchSeek = () => {
      unsubscribeSeek();
      unsubscribeSeek = subscribe(seekController, (value) =>
        invalidate(MenuSlot.seekState, (seekState = value)),
      );
    };
  subscribeComponent(component, settings, (value) =>
    invalidate(MenuSlot.currentSettings, (currentSettings = value)),
  );
  component.$$.on_destroy!.push(() => unsubscribePlayback());
  component.$$.on_destroy!.push(() => unsubscribeVolume());
  component.$$.on_destroy!.push(() => unsubscribeSeek());
  var holdDefinition: ReturnType<typeof screenDefinition>["selectHold"],
    holdDuration: number | undefined;
  const logger = createLogger("<Menu>"),
    i18n = useI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(MenuSlot.translations, (translations = value)),
  );
  let { data = void 0 } = props,
    { playback } = props;
  watchPlayback();
  let { navigateToUrl = void 0 } = props,
    { disabled = false } = props;
  const seekController = createSeekController(playback);
  watchSeek();
  const listAccelerator = createAcceleration(listAcceleration),
    volumeController = createVolumeController(playback);
  watchVolume();
  const selectionMemory = createSelectionMemory(),
    scrollTargets: Record<
      "list" | "now-playing" | "brick",
      Model.ScrollTarget
    > = {
      list: "list",
      "now-playing": "volume",
      brick: "brick",
    },
    keyboardModes: Record<
      "list" | "now-playing" | "brick",
      "list" | "now-playing" | "passthrough"
    > = {
      list: "list",
      "now-playing": "now-playing",
      brick: "passthrough",
    };
  let screenStack: Model.ScreenState[] = [
      {
        key: "main",
      },
    ],
    selectedIndex: number = 0,
    menuNode: HTMLElement | undefined,
    listNode: HTMLElement | undefined,
    lastArrowTimestamp: number | undefined,
    restoredScrollTop: number | undefined,
    shouldFocusNextScreen: boolean = false,
    isSeeking: boolean = false,
    seekPreviewTime: number | undefined,
    isAdjustingVolume: boolean = false,
    { scrollTarget = "list" } = props,
    { selectHoldMs = null } = props,
    navigationId: number = 0,
    goingBack: boolean = false;
  function focusOutsideMenu() {
    const active = deepActiveElement();
    return (
      !!active &&
      active !== document.body &&
      !(menuNode != null && menuNode.contains(active))
    );
  }
  function itemsForScreen(screen: Model.ScreenState) {
    return screenItems(screen, {
      data,
      hasNowPlaying: listsNowPlaying(screen.key, hasNowPlaying),
      i18n: translations,
    });
  }
  function scrollTargetForScreen(seeking: boolean, value: Model.ScreenKey) {
    return seeking ? "seek" : scrollTargets[screenDefinition(value).view];
  }
  function currentScrollTarget() {
    return scrollTargetForScreen(
      seekController.peek().isSeeking,
      last(screenStack).key,
    );
  }
  let suppressNowPlayingSync: boolean = false;
  function initialSelection(screen: Model.ScreenState) {
    var firstRow: Model.MenuRow | undefined;
    const items = itemsForScreen(screen);
    if (
      ((firstRow = items[0]) === null || firstRow === void 0
        ? void 0
        : firstRow.action) !== "toggle"
    ) {
      const playingIndex = playingRowIndex(items, playbackState);
      return playingIndex >= 0
        ? playingIndex
        : Math.max(0, selectionMemory.rememberedIndexIn(screen, items));
    }
    const settingIndex = items.findIndex(
      (value) =>
        value.action === "toggle" &&
        value.target === currentSettings[screen.key as keyof Model.Settings],
    );
    return settingIndex >= 0 ? settingIndex : 0;
  }
  function handleScreenChange(value: Model.ScreenKey) {
    const nowPlaying = screenDefinition(value).view === "now-playing";
    seekController.handleScreenChange(nowPlaying);
    volumeController.handleScreenChange(nowPlaying);
  }
  function pushScreen(screen: Model.ScreenState, idleJump: boolean = false) {
    var selectedRow: Model.MenuRow | undefined;
    invalidate(
      MenuSlot.shouldFocusNextScreen,
      (shouldFocusNextScreen = idleJump
        ? !!(menuNode != null && menuNode.contains(deepActiveElement()))
        : !focusOutsideMenu()),
    );
    invalidate(MenuSlot.goingBack, (goingBack = false));
    invalidate(MenuSlot.navigationId, (navigationId += 1));
    invalidate(MenuSlot.restoredScrollTop, (restoredScrollTop = void 0));
    lastArrowTimestamp = void 0;
    const previous = last(screenStack);
    selectionMemory.remember(previous, currentItems, selectedIndex);
    const savedScreen = Object.assign(Object.assign({}, previous), {
      selectedItemId:
        (selectedRow = currentItems[selectedIndex]) === null ||
        selectedRow === void 0
          ? void 0
          : selectedRow.id,
      selectedIndexAtPush: selectedIndex,
      scrollTopAtPush: listNode == null ? void 0 : listNode.scrollTop,
      // An idle jump wasn't the user's choice, so it keeps their row.
      suppressNowPlayingSyncAtPush: idleJump && suppressNowPlayingSync,
    });
    invalidate(
      MenuSlot.screenStack,
      (screenStack = [...screenStack.slice(0, -1), savedScreen, screen]),
    );
    invalidate(
      MenuSlot.selectedIndex,
      (selectedIndex = initialSelection(screen)),
    );
    invalidate(
      MenuSlot.suppressNowPlayingSync,
      (suppressNowPlayingSync = false),
    );
    handleScreenChange(screen.key);
    listAccelerator.reset();
  }
  function popScreen() {
    var savedSuppression: boolean | undefined;
    if (screenStack.length <= 1) return;
    invalidate(
      MenuSlot.shouldFocusNextScreen,
      (shouldFocusNextScreen = !focusOutsideMenu()),
    );
    invalidate(MenuSlot.goingBack, (goingBack = true));
    invalidate(MenuSlot.navigationId, (navigationId += 1));
    lastArrowTimestamp = void 0;
    selectionMemory.remember(last(screenStack), currentItems, selectedIndex);
    invalidate(MenuSlot.screenStack, (screenStack = screenStack.slice(0, -1)));
    const screen = last(screenStack);
    invalidate(
      MenuSlot.suppressNowPlayingSync,
      (suppressNowPlayingSync =
        (savedSuppression = screen.suppressNowPlayingSyncAtPush) !== null &&
        savedSuppression !== void 0
          ? savedSuppression
          : false),
    );
    handleScreenChange(screen.key);
    listAccelerator.reset();
    const items = itemsForScreen(screen),
      playingIndex = playingRowIndex(items, playbackState),
      {
        selectedIndexAtPush: previousSelection,
        scrollTopAtPush: previousScrollTop,
      } = screen;
    if (playingIndex >= 0 && !suppressNowPlayingSync) {
      invalidate(MenuSlot.selectedIndex, (selectedIndex = playingIndex));
    } else {
      invalidate(
        MenuSlot.selectedIndex,
        (selectedIndex = Math.max(
          0,
          selectionMemory.rememberedIndexIn(screen, items),
        )),
      );
    }
    invalidate(
      MenuSlot.restoredScrollTop,
      (restoredScrollTop =
        selectedIndex === previousSelection ? previousScrollTop : void 0),
    );
  }
  function back() {
    popScreen();
  }
  let brick: BrickHandle | null | undefined = null,
    brickScore: number = 0,
    brickBalls: number = 0;
  function selectHold() {
    const value = screenDefinition(currentScreen.key).selectHold;
    if (value) {
      pushScreen({
        key: value.target,
      });
    }
  }
  function turnPaddle(degrees: number) {
    if (!(brick == null)) {
      brick.movePaddle(degrees / paddleTurnDegrees);
    }
  }
  function steerPaddle(direction: number | null | undefined) {
    if (!(brick == null)) {
      brick.steerPaddle(direction ?? 0);
    }
  }
  const idleJumpTimer = createIdleTimer(nowPlayingIdleDelayMs, () =>
    pushScreen(nowPlayingScreen(), true),
  );
  function notifyActivity() {
    if (idleJumpArmed) {
      idleJumpTimer.start();
    }
  }
  onDestroy(
    playback.onQueueFinished(() => {
      selectionMemory.clearQueueSource();
      if (view === "now-playing") {
        back();
        if (last(screenStack).selectedItemId === nowPlayingScreenKey) {
          invalidate(MenuSlot.selectedIndex, (selectedIndex = 0));
          invalidate(MenuSlot.restoredScrollTop, (restoredScrollTop = void 0));
        }
      }
    }),
  );
  function moveSelection(steps: number) {
    if (currentItems.length === 0) return false;
    const nextIndex = Math.min(
        currentItems.length - 1,
        Math.max(0, selectedIndex + steps),
      ),
      moved = nextIndex !== selectedIndex;
    invalidate(MenuSlot.selectedIndex, (selectedIndex = nextIndex));
    if (moved) {
      invalidate(
        MenuSlot.suppressNowPlayingSync,
        (suppressNowPlayingSync = true),
      );
    }
    return moved;
  }
  function accelerate(speed: number, direction: number) {
    const target = currentScrollTarget(),
      seekMultiplier = seekController.accelerate(speed, direction),
      listMultiplier = listAccelerator.next(
        speed,
        direction,
        target === "list",
      );
    return target === "seek" ? seekMultiplier : listMultiplier;
  }
  function moveBy(direction: number, steps: number = 1) {
    switch (currentScrollTarget()) {
      case "seek":
        return seekController.seek(direction * steps);
      case "volume":
        return direction > 0
          ? volumeController.increase(steps)
          : volumeController.decrease(steps);
      case "list":
        return moveSelection(direction * steps);
      default:
        return false;
    }
  }
  function keyStep(direction: number, heldMs: number) {
    switch (currentScrollTarget()) {
      case "seek":
        return moveBy(direction, seekController.accelerateHold(heldMs));
      case "volume":
        return moveBy(direction, keySeekStepSeconds);
      default:
        return moveBy(direction, accelerationTier(listAcceleration, heldMs));
    }
  }
  function select() {
    if (view === "brick") {
      if (!(brick == null)) {
        brick.launchBall();
      }
      return;
    }
    if (view === "now-playing") {
      if (volumeController.peek().isAdjustingVolume) {
        volumeController.exit();
        return;
      }
      if (!playbackState.hasLoadedItem) return;
      seekController.toggle();
      return;
    }
    const row = currentItems[selectedIndex];
    if (row)
      switch (row.action) {
        case "navigate":
          pushScreen({
            key: row.target,
            contextId: row.contextId,
            titleKey: row.screenTitleKey,
          });
          break;
        case "inline-toggle": {
          const selectedValue = currentSettings[row.toggleKey],
            valueIndex = row.values.indexOf(selectedValue),
            nextValue = row.values[(valueIndex + 1) % row.values.length];
          settings.update((value) =>
            Object.assign(Object.assign({}, value), {
              [row.toggleKey]: nextValue,
            }),
          );
          break;
        }
        case "toggle":
          setBacklight(row.target);
          popScreen();
          break;
        case "cancel":
          popScreen();
          break;
        case "reset-all":
          resetSettings();
          popScreen();
          break;
        case "play": {
          if (data) {
            const selectedValue = playableRows(currentItems).indexOf(row);
            if (selectedValue >= 0) {
              if (
                playingRowIndex(currentItems, playbackState) === selectedIndex
              ) {
                if (!playbackState.isPlaying) {
                  playback.resume();
                }
              } else {
                selectionMemory.setQueueSource(currentScreen);
                playback.play(queueFromRows(currentItems, data), selectedValue);
              }
              pushScreen(nowPlayingScreen());
            } else {
              logger.warn("Selected song not found in queue:", row.songId);
            }
          }
          break;
        }
        case "info":
          break;
        default:
          logger.warn("Unhandled menu item action:", row);
          break;
      }
  }
  function playCollection(value: Model.MenuRow | undefined) {
    if (value?.action !== "navigate" || !isSongScreen(value.target) || !data)
      return false;
    const queue = screenSongs(value.target, value.contextId, data);
    return queue.length === 0
      ? false
      : (selectionMemory.setQueueSource({
          key: value.target,
          contextId: value.contextId,
        }),
        playback.play(queue),
        pushScreen(nowPlayingScreen()),
        true);
  }
  function play() {
    if (playbackState.hasLoadedItem) {
      if (playbackState.isPlaying) {
        playback.pause();
      } else {
        playback.resume();
      }
      return;
    }
    if (playbackState.isLoading) {
      playback.pause();
      return;
    }
    const row = currentItems[selectedIndex];
    if (!playCollection(row)) {
      if ((row == null ? void 0 : row.action) === "play") {
        select();
        return;
      }
      if (playbackState.queue.length > 0) {
        playback.resume();
      }
    }
  }
  const dispatch = createEventDispatcher();
  function arrow(event: Event, direction: number) {
    const speed = measureSpeed(
      event.timeStamp,
      lastArrowTimestamp,
      keyboardStepDegrees,
    );
    lastArrowTimestamp = event.timeStamp;
    const multiplier = accelerate(speed, direction);
    moveBy(direction, multiplier);
  }
  function seekStart() {
    if (playbackState.hasLoadedItem) {
      volumeController.exit();
      seekController.keepOpen();
    }
  }
  function volumeStart() {
    seekController.exit();
    volumeController.keepOpen();
  }
  function seekChanged(event: CustomEvent<number>) {
    seekStart();
    seekController.seekTo(event.detail);
  }
  function volumeChanged(event: CustomEvent<number>) {
    volumeController.keepOpen();
    volumeController.set(event.detail);
  }
  onDestroy(() => {
    seekController.destroy();
    volumeController.destroy();
    idleJumpTimer.destroy();
  });
  function bindBrick(instance: BrickHandle | null | undefined) {
    bindingCallbacks[instance ? "unshift" : "push"](() => {
      brick = instance;
      invalidate(MenuSlot.brick, brick);
    });
  }
  function scoreChanged(score: number) {
    brickScore = score;
    invalidate(MenuSlot.brickScore, brickScore);
  }
  function ballsChanged(balls: number) {
    brickBalls = balls;
    invalidate(MenuSlot.brickBalls, brickBalls);
  }
  const listMounted = (value: CustomEvent<HTMLElement>) => {
      invalidate(MenuSlot.listNode, (listNode = value.detail));
    },
    listUnmounted = (value: CustomEvent<HTMLElement>) => {
      if (listNode === value.detail) {
        invalidate(MenuSlot.listNode, (listNode = void 0));
      }
    },
    menuHold = () => dispatch("menuhold");
  function bindMenuNode(node: HTMLElement | null | undefined) {
    bindingCallbacks[node ? "unshift" : "push"](() => {
      menuNode = node!;
      invalidate(MenuSlot.menuNode, menuNode);
    });
  }
  component.$$set = (value) => {
    if ("data" in value) {
      invalidate(MenuSlot.data, (data = value.data!));
    }
    if ("playback" in value) {
      invalidate(MenuSlot.playback, (playback = value.playback!));
      watchPlayback();
    }
    if ("navigateToUrl" in value) {
      invalidate(
        MenuSlot.navigateToUrl,
        (navigateToUrl = value.navigateToUrl!),
      );
    }
    if ("disabled" in value) {
      invalidate(MenuSlot.disabled, (disabled = value.disabled!));
    }
    if ("scrollTarget" in value) {
      invalidate(MenuSlot.scrollTarget, (scrollTarget = value.scrollTarget!));
    }
    if ("selectHoldMs" in value) {
      invalidate(MenuSlot.selectHoldMs, (selectHoldMs = value.selectHoldMs!));
    }
  };
  component.$$.update = () => {
    if (component.$$.dirty[1] & (1 << (MenuSlot.seekState % 31))) {
      invalidate(
        MenuSlot.isSeeking,
        ({ isSeeking, seekPreviewTime } = seekState),
        isSeeking,
        (invalidate(MenuSlot.seekPreviewTime, seekPreviewTime),
        invalidate(MenuSlot.seekState, seekState)),
      );
    }
    if (component.$$.dirty[1] & (1 << (MenuSlot.volumeState % 31))) {
      invalidate(
        MenuSlot.isAdjustingVolume,
        ({ isAdjustingVolume } = volumeState),
        isAdjustingVolume,
      );
    }
    if (component.$$.dirty[0] & (1 << MenuSlot.playbackState)) {
      invalidate(
        MenuSlot.hasNowPlaying,
        (hasNowPlaying = playbackState.queue.length > 0),
      );
    }
    if (component.$$.dirty[1] & (1 << (MenuSlot.screenStack % 31))) {
      invalidate(MenuSlot.currentScreen, (currentScreen = last(screenStack)));
    }
    if (component.$$.dirty[1] & (1 << (MenuSlot.currentScreen % 31))) {
      invalidate(
        MenuSlot.view,
        (view = screenDefinition(currentScreen.key).view),
      );
    }
    if (
      component.$$.dirty[1] &
      ((1 << (MenuSlot.data % 31)) |
        (1 << (MenuSlot.currentScreen % 31)) |
        (1 << (MenuSlot.translations % 31)))
    ) {
      invalidate(
        MenuSlot.title,
        (title = screenTitle(currentScreen, data, translations)),
      );
    }
    if (
      (component.$$.dirty[0] & (1 << MenuSlot.isSeeking)) |
      (component.$$.dirty[1] & (1 << (MenuSlot.currentScreen % 31)))
    ) {
      invalidate(
        MenuSlot.scrollTarget,
        (scrollTarget = scrollTargetForScreen(isSeeking, currentScreen.key)),
      );
    }
    if (
      component.$$.dirty[1] &
      ((1 << (MenuSlot.holdDefinition % 31)) |
        (1 << (MenuSlot.holdDuration % 31)) |
        (1 << (MenuSlot.currentScreen % 31)))
    ) {
      invalidate(
        MenuSlot.selectHoldMs,
        (selectHoldMs =
          invalidate(
            MenuSlot.holdDuration,
            (holdDuration =
              invalidate(
                MenuSlot.holdDefinition,
                (holdDefinition = screenDefinition(
                  currentScreen.key,
                ).selectHold),
              ) === null || holdDefinition === void 0
                ? void 0
                : holdDefinition.ms),
          ) !== null && holdDuration !== void 0
            ? holdDuration
            : null),
      );
    }
    if (
      component.$$.dirty[1] &
      ((1 << (MenuSlot.currentScreen % 31)) |
        (1 << (MenuSlot.hasNowPlaying % 31)))
    ) {
      invalidate(
        MenuSlot.currentHasNowPlaying,
        (currentHasNowPlaying = listsNowPlaying(
          currentScreen.key,
          hasNowPlaying,
        )),
      );
    }
    if (
      component.$$.dirty[1] &
      ((1 << (MenuSlot.data % 31)) |
        (1 << (MenuSlot.currentScreen % 31)) |
        (1 << (MenuSlot.currentHasNowPlaying % 31)) |
        (1 << (MenuSlot.translations % 31)))
    ) {
      invalidate(
        MenuSlot.currentItems,
        (currentItems = screenItems(currentScreen, {
          data,
          hasNowPlaying: currentHasNowPlaying,
          i18n: translations,
        })),
      );
    }
    if (
      component.$$.dirty[0] &
        ((1 << MenuSlot.selectedIndex) | (1 << MenuSlot.currentItems)) &&
      selectedIndex >= currentItems.length
    ) {
      invalidate(
        MenuSlot.selectedIndex,
        (selectedIndex = Math.max(0, currentItems.length - 1)),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << MenuSlot.view) | (1 << MenuSlot.playbackState))
    ) {
      invalidate(
        MenuSlot.currentSong,
        (currentSong =
          view === "now-playing"
            ? playbackState.queue[playbackState.currentTrackIndex]
            : void 0),
      );
    }
    if (
      (component.$$.dirty[0] &
        ((1 << MenuSlot.currentItems) | (1 << MenuSlot.playbackState))) |
        (component.$$.dirty[1] &
          ((1 << (MenuSlot.screenStack % 31)) |
            (1 << (MenuSlot.suppressNowPlayingSync % 31)))) &&
      selectionMemory.syncQueue(playbackState, screenStack)
    ) {
      const value = playingRowIndex(currentItems, playbackState);
      if (value >= 0 && !suppressNowPlayingSync) {
        invalidate(MenuSlot.selectedIndex, (selectedIndex = value));
      }
    }
    if (
      (component.$$.dirty[0] & (1 << MenuSlot.playbackState)) |
      (component.$$.dirty[1] & (1 << (MenuSlot.currentScreen % 31)))
    ) {
      invalidate(
        MenuSlot.idleJumpArmed,
        (idleJumpArmed =
          playbackState.isPlaying &&
          !screenDefinition(currentScreen.key).blocksIdleJump),
      );
    }
    if (component.$$.dirty[1] & (1 << (MenuSlot.idleJumpArmed % 31))) {
      if (idleJumpArmed) {
        idleJumpTimer.start();
      } else {
        idleJumpTimer.stop();
      }
    }
    if (component.$$.dirty[0] & (1 << MenuSlot.view)) {
      invalidate(MenuSlot.keyboardMode, (keyboardMode = keyboardModes[view]));
    }
  };
  return [
    playback,
    navigateToUrl,
    disabled,
    seekController,
    volumeController,
    back,
    select,
    selectedIndex,
    isSeeking,
    view,
    currentItems,
    playbackState,
    menuNode,
    listNode,
    restoredScrollTop,
    shouldFocusNextScreen,
    seekPreviewTime,
    isAdjustingVolume,
    navigationId,
    goingBack,
    brick,
    brickScore,
    brickBalls,
    keyboardMode,
    currentSong,
    title,
    i18n,
    dispatch,
    arrow,
    seekStart,
    volumeStart,
    seekChanged,
    volumeChanged,
    scrollTarget,
    selectHoldMs,
    data,
    currentScrollTarget,
    selectHold,
    turnPaddle,
    steerPaddle,
    notifyActivity,
    accelerate,
    moveBy,
    keyStep,
    play,
    holdDefinition,
    holdDuration,
    screenStack,
    suppressNowPlayingSync,
    currentScreen,
    idleJumpArmed,
    currentHasNowPlaying,
    hasNowPlaying,
    translations,
    volumeState,
    seekState,
    bindBrick,
    scoreChanged,
    ballsChanged,
    listMounted,
    listUnmounted,
    menuHold,
    bindMenuNode,
  ] satisfies [unknown, ...unknown[]];
}
function ipodInstance(
  component: Component<unknown[], DeviceProps>,
  props: DeviceProps,
  invalidate: Invalidate,
) {
  let backlightOverride: boolean | undefined,
    isBacklit!: boolean,
    activeLocale!: Model.Locale,
    isSeeking!: boolean,
    offlineMessage!: string,
    isLoading!: boolean,
    isInert!: boolean,
    shuffleSongs!: boolean,
    repeatMode!: Model.PlayerRepeatMode,
    currentSettings!: Model.Settings,
    catalogState!: Model.CatalogState,
    playbackState!: Model.PlaybackState,
    translations!: Model.I18n,
    isPlaybackAllowed!: boolean,
    backlightState!: boolean;
  subscribeComponent(component, settings, (value) =>
    invalidate(DeviceSlot.currentSettings, (currentSettings = value)),
  );
  subscribeComponent(component, playbackAllowed, (value) =>
    invalidate(DeviceSlot.isPlaybackAllowed, (isPlaybackAllowed = value)),
  );
  let { locale = defaultLocale } = props,
    { dragStepDegrees = defaultDragStepDegrees } = props,
    { backlit = void 0 } = props,
    { playback: hostPlayback = void 0 } = props,
    { navigateToUrl = void 0 } = props,
    { i18n: hostI18n = void 0 } = props;
  const logger = createLogger("<IPod>"),
    untilDestroyed = runUntilDestroyed(),
    audioContext = createAudioContext(),
    clickSound = createClickSound(clickSoundUrl, audioContext),
    playbackStore = createPlaybackStore(audioContext);
  subscribeComponent(component, playbackStore, (value) =>
    invalidate(DeviceSlot.playbackState, (playbackState = value)),
  );
  const backlight = createBacklight();
  subscribeComponent(component, backlight, (value) =>
    invalidate(DeviceSlot.backlightState, (backlightState = value)),
  );
  const i18n = provideI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(DeviceSlot.translations, (translations = value)),
  );
  const { iPodData: catalogStore, loadIPodData: loadCatalog } =
    createCatalogStore();
  subscribeComponent(component, catalogStore, (value) =>
    invalidate(DeviceSlot.catalogState, (catalogState = value)),
  );
  const iPodDataStore = catalogStore;
  let menu!: MenuHandle,
    minDisplayTimeElapsed: boolean = false,
    maxHoldElapsed: boolean = false,
    liveRegionMounted: boolean = false,
    scrollTarget: Model.ScrollTarget = "list",
    selectHoldMs: number | null = null,
    hasBeenReady: boolean = false,
    status: string = "",
    lastVolumePercent: number = currentSettings.volume;
  const saveVolumeTimer = createIdleTimer(volumeSaveDelayMs, () => {
      settings.update((value) =>
        Object.assign(Object.assign({}, value), {
          volume: lastVolumePercent,
        }),
      );
    }),
    unsubscribeReset = onSettingsReset(() => {
      saveVolumeTimer.stop();
      invalidate(
        DeviceSlot.lastVolumePercent,
        (lastVolumePercent = currentSettings.volume),
      );
      playbackStore.setVolume(volumeFromPercent(lastVolumePercent));
    });
  function notifyActivity() {
    backlight.notifyActivity();
    if (!(menu == null)) {
      menu.notifyActivity();
    }
  }
  function activateAudio() {
    resumeAudio(audioContext);
    notifyActivity();
  }
  function keydownActivity(event: KeyboardEvent) {
    if (!event.repeat || event.key.startsWith("Arrow")) {
      activateAudio();
    }
  }
  const heldSeek = createHeldSeek();
  function seekWhileHeld(direction: number, { repeat }: Model.HeldSeekDetail) {
    const {
        hasLoadedItem,
        currentTrackIndex,
        currentPlaybackTime,
        currentPlaybackDuration,
      } = playbackState,
      time = heldSeek.step(direction, repeat, {
        isInert,
        isSeeking,
        hasLoadedItem,
        currentTrackIndex,
        currentPlaybackTime,
        currentPlaybackDuration,
      });
    if (time !== void 0) {
      notifyActivity();
      playbackStore.seek(time);
    }
  }
  function playClicks(count: number, target: Model.ScrollTarget) {
    if (!(currentSettings.clicker !== ClickerMode.ON || target === "seek"))
      for (let index = 0; index < count; index += 1) clickSound.playClick();
  }
  const wheelScroll = createWheelScroll({
    move: (value, value2) => menu.moveBy(value, value2),
    click: playClicks,
  });
  function wheelscroll(event: CustomEvent<Model.WheelScrollDetail>) {
    notifyActivity();
    if (isInert || !menu) return;
    const { step, degrees, speed } = event.detail,
      target = menu.currentScrollTarget();
    if (target === "brick") {
      menu.turnPaddle(step * degrees);
      return;
    }
    wheelScroll.scroll({
      step,
      degrees,
      target,
      multiplier: menu.accelerate(speed, step),
      dragStepDegrees,
    });
  }
  function wheelkeystep(
    event: CustomEvent<{
      step: number;
      heldMs: number;
    }>,
  ) {
    notifyActivity();
    if (isInert || !menu) return;
    const { step, heldMs } = event.detail,
      target = menu.currentScrollTarget();
    if (menu.keyStep(step, heldMs)) {
      playClicks(1, target);
    }
  }
  function wheelDragStart() {
    wheelScroll.reset();
    if (!(isLoading || menu == null)) {
      menu.seekController.handleDragStart();
    }
  }
  function whenInteractive(action: () => void) {
    return () => {
      if (!isPlaybackAllowed) {
        playbackAllowed.set(true);
        menu.back();
        return;
      }
      if (!isInert) {
        action();
      }
    };
  }
  let minDisplayTimer: ReturnType<typeof setTimeout> | undefined,
    maxHoldTimer: ReturnType<typeof setTimeout> | undefined;
  function clearStartupTimers() {
    clearTimeout(minDisplayTimer);
    clearTimeout(maxHoldTimer);
  }
  function playbackAllowedChanged(allowed: boolean) {
    if (!allowed) {
      if (!hasBeenReady) {
        clearStartupTimers();
      }
      playbackStore.pause();
      return;
    }
    if (hasBeenReady) {
      invalidate(DeviceSlot.maxHoldElapsed, (maxHoldElapsed = true));
    } else {
      invalidate(
        DeviceSlot.minDisplayTimeElapsed,
        (minDisplayTimeElapsed = false),
      );
      invalidate(DeviceSlot.maxHoldElapsed, (maxHoldElapsed = false));
      minDisplayTimer = setTimeout(() => {
        invalidate(
          DeviceSlot.minDisplayTimeElapsed,
          (minDisplayTimeElapsed = true),
        );
      }, startupMinDisplayMs);
      maxHoldTimer = setTimeout(() => {
        invalidate(DeviceSlot.maxHoldElapsed, (maxHoldElapsed = true));
      }, startupMaxHoldMs);
    }
    if (catalogState.status !== "ready") {
      loadCatalog(activeLocale);
    }
  }
  onMount(() => {
    playbackStore.setVolume(volumeFromPercent(currentSettings.volume));
    untilDestroyed(async (value2) => {
      await value2();
      invalidate(DeviceSlot.liveRegionMounted, (liveRegionMounted = true));
    });
    const value = playbackAllowed.subscribe(playbackAllowedChanged);
    return () => {
      value();
      clearStartupTimers();
    };
  });
  onDestroy(() => {
    saveVolumeTimer.flush();
    unsubscribeReset();
    playbackStore.destroy();
    backlight.destroy();
  });
  closeAudioOnDestroy(audioContext);
  function bindMenu(instance: MenuHandle | null) {
    bindingCallbacks[instance ? "unshift" : "push"](() => {
      menu = instance!;
      invalidate(DeviceSlot.menu, menu);
    });
  }
  function scrollTargetChanged(target: Model.ScrollTarget) {
    scrollTarget = target;
    invalidate(DeviceSlot.scrollTarget, scrollTarget);
  }
  function selectHoldChanged(duration: number | null) {
    selectHoldMs = duration;
    invalidate(DeviceSlot.selectHoldMs, selectHoldMs);
  }
  const steerPaddle = (value: CustomEvent<number | null>) =>
      menu == null ? void 0 : menu.steerPaddle(value.detail),
    select = () => menu.select(),
    selectHold = () => menu.selectHold(),
    back = () => menu.back(),
    play = () => menu.play(),
    wheelDragEnd = () =>
      menu == null ? void 0 : menu.seekController.handleDragEnd(),
    previous = () => {
      if (!isSeeking) {
        playbackStore.skipPrevious();
      }
    },
    next = () => {
      if (!isSeeking) {
        playbackStore.skipNext();
      }
    },
    seekBackward = (value: CustomEvent<Model.HeldSeekDetail>) =>
      seekWhileHeld(-1, value.detail),
    seekForward = (value: CustomEvent<Model.HeldSeekDetail>) =>
      seekWhileHeld(1, value.detail);
  component.$$set = (value) => {
    if ("locale" in value) {
      invalidate(DeviceSlot.locale, (locale = value.locale!));
    }
    if ("dragStepDegrees" in value) {
      invalidate(
        DeviceSlot.dragStepDegrees,
        (dragStepDegrees = value.dragStepDegrees!),
      );
    }
    if ("backlit" in value) {
      invalidate(DeviceSlot.backlit, (backlit = value.backlit!));
    }
    if ("playback" in value) {
      invalidate(DeviceSlot.hostPlayback, (hostPlayback = value.playback!));
    }
    if ("navigateToUrl" in value) {
      invalidate(
        DeviceSlot.navigateToUrl,
        (navigateToUrl = value.navigateToUrl!),
      );
    }
    if ("i18n" in value) {
      invalidate(DeviceSlot.hostI18n, (hostI18n = value.i18n!));
    }
  };
  component.$$.update = () => {
    if (component.$$.dirty[0] & (1 << DeviceSlot.backlit)) {
      invalidate(
        DeviceSlot.backlightOverride,
        (backlightOverride =
          typeof backlit == "string" ? backlit !== "false" : backlit),
      );
    }
    if (
      component.$$.dirty[1] &
      ((1 << (DeviceSlot.backlightOverride % 31)) |
        (1 << (DeviceSlot.backlightState % 31)))
    ) {
      invalidate(
        DeviceSlot.isBacklit,
        (isBacklit = backlightOverride ?? backlightState),
      );
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.hostPlayback)) {
      playbackStore.setPlayback(hostPlayback);
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.locale)) {
      invalidate(
        DeviceSlot.activeLocale,
        (activeLocale = locale ?? defaultLocale),
      );
    }
    if (
      (component.$$.dirty[0] & (1 << DeviceSlot.hostI18n)) |
      (component.$$.dirty[1] & (1 << (DeviceSlot.activeLocale % 31)))
    ) {
      i18n.set(createI18n(hostI18n, activeLocale.language));
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.scrollTarget)) {
      invalidate(DeviceSlot.isSeeking, (isSeeking = scrollTarget === "seek"));
    }
    if (component.$$.dirty[1] & (1 << (DeviceSlot.translations % 31))) {
      invalidate(
        DeviceSlot.offlineMessage,
        (offlineMessage = translations.t("ASE.Web.IPod.Error.NotConnected")),
      );
    }
    if (
      (component.$$.dirty[0] &
        ((1 << DeviceSlot.catalogState) |
          (1 << DeviceSlot.minDisplayTimeElapsed))) |
      (component.$$.dirty[1] & (1 << (DeviceSlot.maxHoldElapsed % 31)))
    ) {
      invalidate(
        DeviceSlot.isLoading,
        (isLoading =
          (!maxHoldElapsed && catalogState.status === "loading") ||
          !minDisplayTimeElapsed),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << DeviceSlot.isLoading) | (1 << DeviceSlot.isPlaybackAllowed))
    ) {
      invalidate(
        DeviceSlot.isInert,
        (isInert = isLoading || !isPlaybackAllowed),
      );
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.isInert)) {
      if (!isInert) {
        hasBeenReady = true;
      }
    }
    if (
      (component.$$.dirty[0] &
        ((1 << DeviceSlot.isLoading) |
          (1 << DeviceSlot.offlineMessage) |
          (1 << DeviceSlot.isPlaybackAllowed))) |
        (component.$$.dirty[1] &
          ((1 << (DeviceSlot.liveRegionMounted % 31)) |
            (1 << (DeviceSlot.translations % 31)))) &&
      liveRegionMounted
    ) {
      if (isPlaybackAllowed) {
        invalidate(
          DeviceSlot.status,
          (status = translations.t(
            isLoading
              ? "ASE.Web.IPod.Status.Loading"
              : "ASE.Web.IPod.Status.Ready",
          )),
        );
      } else {
        invalidate(DeviceSlot.status, (status = offlineMessage));
      }
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.catalogState)) {
      if (catalogState.status === "error") {
        logger.error("Failed to load iPod data", catalogState.error);
      } else {
        logger.debug("iPod data status:", catalogState);
      }
    }
    if (
      (component.$$.dirty[0] & (1 << DeviceSlot.playbackState)) |
        (component.$$.dirty[1] & (1 << (DeviceSlot.lastVolumePercent % 31))) &&
      playbackState.playerReady
    ) {
      const value = volumeToPercent(playbackState.volume);
      if (value !== lastVolumePercent) {
        invalidate(DeviceSlot.lastVolumePercent, (lastVolumePercent = value));
        saveVolumeTimer.start();
      }
    }
    if (component.$$.dirty[1] & (1 << (DeviceSlot.currentSettings % 31))) {
      invalidate(
        DeviceSlot.shuffleSongs,
        (shuffleSongs = currentSettings.shuffle === ShuffleMode.SONGS),
      );
    }
    if (component.$$.dirty[1] & (1 << (DeviceSlot.currentSettings % 31))) {
      invalidate(
        DeviceSlot.repeatMode,
        (repeatMode = playerRepeatMode(currentSettings.repeat)),
      );
    }
    if (component.$$.dirty[1] & (1 << (DeviceSlot.shuffleSongs % 31))) {
      playbackStore.setShuffle(shuffleSongs);
    }
    if (component.$$.dirty[1] & (1 << (DeviceSlot.repeatMode % 31))) {
      playbackStore.setRepeatMode(repeatMode);
    }
    if (component.$$.dirty[0] & (1 << DeviceSlot.isSeeking) && isSeeking) {
      heldSeek.cancel();
    }
  };
  return [
    navigateToUrl,
    scrollTarget as Model.ScrollTarget,
    isInert,
    isLoading,
    isSeeking,
    offlineMessage,
    catalogState,
    playbackState,
    isPlaybackAllowed,
    menu,
    selectHoldMs as number | null,
    status,
    isBacklit,
    playbackStore,
    backlight,
    i18n,
    catalogStore,
    activateAudio,
    keydownActivity,
    seekWhileHeld,
    wheelscroll,
    wheelkeystep,
    wheelDragStart,
    whenInteractive,
    locale,
    dragStepDegrees,
    backlit,
    hostPlayback,
    hostI18n,
    iPodDataStore,
    minDisplayTimeElapsed,
    maxHoldElapsed,
    liveRegionMounted,
    lastVolumePercent,
    activeLocale,
    repeatMode,
    shuffleSongs,
    backlightOverride,
    currentSettings,
    translations,
    backlightState,
    bindMenu,
    scrollTargetChanged,
    selectHoldChanged,
    steerPaddle,
    select,
    selectHold,
    back,
    play,
    wheelDragEnd,
    previous,
    next,
    seekBackward,
    seekForward,
  ] satisfies [unknown, ...unknown[]];
}
export { ipodInstance, menuInstance };
export type MenuContext = ReturnType<typeof menuInstance>;
export type DeviceContext = ReturnType<typeof ipodInstance>;
