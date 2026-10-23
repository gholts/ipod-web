import type * as Model from "../types.js";
// Menu definitions, selection memory, and temporary seek/volume modes.
import { getStore, writable } from "./runtime.js";
import {
  ClickerMode,
  RepeatMode,
  ShuffleMode,
  backlightOptions,
  brickSelectHoldMs,
  seekAcceleration,
  seekCommitDelayMs,
  seekIdleTimeoutMs,
  seekStepSeconds,
  volumeIdleTimeoutMs,
  volumeStepPercent,
} from "./settings.js";
import {
  accelerationTier,
  createAcceleration,
  createIdleTimer,
  volumeFromPercent,
  volumeToPercent,
} from "./input.js";
import { defaultI18n, screenSongs } from "./i18n.js";
function createTemporaryMode({
  timeoutMs,
  isActive,
  enter,
  onLeave,
}: {
  timeoutMs: number;
  isActive: () => boolean;
  enter: () => void;
  onLeave: () => void;
}) {
  let heldOpen = false,
    timer: ReturnType<typeof createIdleTimer>;
  function leave() {
    if (isActive()) {
      timer.stop();
      onLeave();
    }
  }
  timer = createIdleTimer(timeoutMs, leave);
  function restartIdleTimer() {
    if (!heldOpen) {
      timer.start();
    }
  }
  function keepOpen() {
    heldOpen = true;
    timer.stop();
    if (!isActive()) {
      enter();
    }
  }
  function release() {
    heldOpen = false;
    if (isActive()) {
      timer.start();
    }
  }
  function exit() {
    heldOpen = false;
    leave();
  }
  function reenter() {
    const f = heldOpen;
    leave();
    if (f) {
      enter();
    }
  }
  function handleScreenChange(f: boolean) {
    if (!f) {
      exit();
    }
  }
  return {
    restartIdleTimer,
    keepOpen,
    release,
    exit,
    reenter,
    handleScreenChange,
    destroy: timer.destroy,
  };
}
const initialSeekState: {
  isSeeking: boolean;
  seekPreviewTime?: number;
} = {
  isSeeking: false,
  seekPreviewTime: void 0,
};
function createSeekController(playback: Model.PlaybackController) {
  const store = writable(initialSeekState),
    acceleration = createAcceleration(seekAcceleration);
  let pendingTime: number | undefined,
    commitTimeout: ReturnType<typeof setTimeout> | undefined,
    trackIndex: number | undefined,
    queue: Model.Song[] | undefined,
    dragging = false,
    seekGeneration = 0,
    mode: ReturnType<typeof createTemporaryMode>;
  function commit() {
    clearTimeout(commitTimeout);
    commitTimeout = void 0;
    if (pendingTime === void 0) return;
    const z = pendingTime;
    pendingTime = void 0;
    const k = ++seekGeneration;
    playback.seek(z).then(() => {
      store.update((Y) =>
        k === seekGeneration
          ? {
              ...Y,
              seekPreviewTime: void 0,
            }
          : Y,
      );
    });
  }
  function scheduleCommit() {
    clearTimeout(commitTimeout);
    commitTimeout = setTimeout(commit, seekCommitDelayMs);
  }
  function leave() {
    commit();
    trackIndex = void 0;
    queue = void 0;
    dragging = false;
    store.set(initialSeekState);
  }
  function cancelPending() {
    clearTimeout(commitTimeout);
    commitTimeout = void 0;
    pendingTime = void 0;
  }
  function peek() {
    return getStore(store);
  }
  function enter() {
    const { currentTrackIndex, queue: k } = getStore(playback);
    trackIndex = currentTrackIndex;
    queue = k;
    mode.restartIdleTimer();
    store.set({
      isSeeking: true,
      seekPreviewTime: void 0,
    });
  }
  mode = createTemporaryMode({
    timeoutMs: seekIdleTimeoutMs,
    isActive: () => peek().isSeeking,
    enter,
    onLeave: leave,
  });
  function toggle() {
    if (peek().isSeeking) {
      mode.exit();
      return;
    }
    enter();
  }
  function release() {
    commit();
    mode.release();
  }
  function previewTime() {
    return (
      peek().seekPreviewTime ??
      Math.floor(getStore(playback).currentPlaybackTime)
    );
  }
  function seekTo(time: number) {
    if (!peek().isSeeking) return false;
    const previous = previewTime(),
      { currentPlaybackDuration: duration } = getStore(playback),
      maxTime = duration > 0 ? duration : 1 / 0,
      clamped = Math.min(maxTime, Math.max(0, Math.round(time)));
    mode.restartIdleTimer();
    return clamped === previous
      ? false
      : ((pendingTime = clamped),
        (seekGeneration += 1),
        dragging || scheduleCommit(),
        store.update((X) => ({
          ...X,
          seekPreviewTime: clamped,
        })),
        true);
  }
  function seek(steps: number) {
    return seekTo(previewTime() + steps * seekStepSeconds);
  }
  function accelerate(speed: number, direction: number) {
    const { isSeeking } = peek();
    if (isSeeking) {
      mode.restartIdleTimer();
    }
    return acceleration.next(speed, direction, isSeeking);
  }
  function accelerateHold(heldMs: number) {
    return accelerationTier(seekAcceleration, heldMs);
  }
  function handleDragStart() {
    dragging = true;
    clearTimeout(commitTimeout);
    commitTimeout = void 0;
  }
  function handleDragEnd() {
    dragging = false;
    if (pendingTime !== void 0) {
      scheduleCommit();
    }
  }
  const unsubscribe = playback.subscribe(
    ({
      currentTrackIndex,
      queue: k,
      currentPlaybackDuration,
      hasLoadedItem,
    }) => {
      if (!peek().isSeeking) return;
      if (currentTrackIndex !== trackIndex || k !== queue) {
        cancelPending();
        if (hasLoadedItem) {
          mode.reenter();
        } else {
          mode.exit();
        }
        return;
      }
      const { seekPreviewTime } = peek();
      if (
        currentPlaybackDuration > 0 &&
        seekPreviewTime !== void 0 &&
        seekPreviewTime > currentPlaybackDuration
      ) {
        if (pendingTime !== void 0) {
          pendingTime = currentPlaybackDuration;
        }
        store.update((X) => ({
          ...X,
          seekPreviewTime: currentPlaybackDuration,
        }));
      }
    },
  );
  function destroy() {
    commit();
    mode.destroy();
    unsubscribe();
  }
  return {
    subscribe: store.subscribe,
    peek,
    toggle,
    seek,
    seekTo,
    commit,
    keepOpen: mode.keepOpen,
    release,
    exit: mode.exit,
    handleDragStart,
    handleDragEnd,
    handleScreenChange: mode.handleScreenChange,
    accelerate,
    accelerateHold,
    destroy,
  };
}
const shuffleModes = Object.values(ShuffleMode),
  repeatModes = Object.values(RepeatMode),
  clickerModes = Object.values(ClickerMode);
function noMusicRows(i18n: Model.I18n): Model.MenuRow[] {
  return [
    {
      id: "no-music",
      title: i18n.t("ASE.Web.IPod.Menu.NoMusic"),
      action: "info",
      centered: true,
    },
  ];
}
function rowsOrNoMusic(
  rows: Model.MenuRow[],
  i18n: Model.I18n,
): Model.MenuRow[] {
  return rows.length ? rows : noMusicRows(i18n);
}
function navigationRow(key: Model.ScreenKey, i18n: Model.I18n): Model.MenuRow {
  return {
    id: key,
    // eslint-disable-next-line no-use-before-define -- read at call time
    title: i18n.t(screens[key].titleKey!),
    action: "navigate",
    target: key,
  };
}
function toggleRow(key: Model.BacklightMode, title: string): Model.MenuRow {
  return {
    id: key,
    title,
    action: "toggle",
    target: key,
  };
}
function inlineToggleRow(
  key: "shuffle" | "repeat" | "clicker",
  title: string,
  values: string[],
): Model.MenuRow {
  return {
    id: key,
    title,
    action: "inline-toggle",
    toggleKey: key,
    values,
  };
}
function mainRows({ i18n, hasNowPlaying }: ScreenContext): Model.MenuRow[] {
  return [
    navigationRow("playlists", i18n),
    navigationRow("artists", i18n),
    navigationRow("songs", i18n),
    navigationRow("settings", i18n),
    // Now Playing is the only row driven by playback state.
    ...(hasNowPlaying ? [navigationRow("now-playing", i18n)] : []),
  ];
}
function settingsRows({ i18n }: ScreenContext): Model.MenuRow[] {
  return [
    navigationRow("about", i18n),
    inlineToggleRow(
      "shuffle",
      i18n.t("ASE.Web.IPod.Settings.Shuffle"),
      shuffleModes,
    ),
    inlineToggleRow(
      "repeat",
      i18n.t("ASE.Web.IPod.Settings.Repeat"),
      repeatModes,
    ),
    navigationRow("backlight", i18n),
    inlineToggleRow(
      "clicker",
      i18n.t("ASE.Web.IPod.Settings.Clicker"),
      clickerModes,
    ),
    navigationRow("reset-settings", i18n),
  ];
}
function backlightRows({ i18n }: ScreenContext): Model.MenuRow[] {
  return backlightOptions.map(({ mode, labelKey }) =>
    toggleRow(mode, i18n.t(labelKey)),
  );
}
function resetRows({ i18n }: ScreenContext): Model.MenuRow[] {
  return [
    {
      id: "cancel",
      title: i18n.t("ASE.Web.IPod.Reset.Cancel"),
      action: "cancel",
    },
    {
      id: "reset-all",
      title: i18n.t("ASE.Web.IPod.Reset.Reset"),
      action: "reset-all",
    },
  ];
}
function aboutRows({ data: catalog, i18n }: ScreenContext): Model.MenuRow[] {
  const gigabytes = (l: number) =>
    i18n.formatNumber(l, {
      style: "unit",
      unit: "gigabyte",
    });
  return [
    // Product names are typically not localized.
    {
      id: "ipod",
      title: "iPod",
      action: "info",
      centered: true,
    },
    {
      id: "songs-count",
      title: i18n.t("ASE.Web.IPod.About.Songs"),
      action: "info",
      value: i18n.formatNumber(
        (catalog == null ? void 0 : catalog.songs.length) ?? 0,
      ),
    },
    {
      id: "capacity",
      title: i18n.t("ASE.Web.IPod.About.Capacity"),
      action: "info",
      value: gigabytes(9.2),
    },
    {
      id: "available",
      title: i18n.t("ASE.Web.IPod.About.Available"),
      action: "info",
      value: gigabytes(4.5),
    },
    {
      id: "version",
      title: i18n.t("ASE.Web.IPod.About.Version"),
      action: "info",
      value: "2644.1.0",
    },
  ];
}
function playlistRows({ data: catalog, i18n }: ScreenContext): Model.MenuRow[] {
  const rows: Model.MenuRow[] = (
    (catalog == null ? void 0 : catalog.playlists) ?? []
  ).map((l) => ({
    id: l.id,
    title: l.name,
    action: "navigate",
    target: "playlist-tracks",
    contextId: l.id,
  }));
  return rowsOrNoMusic(rows, i18n);
}
function artistRows({ data: catalog, i18n }: ScreenContext): Model.MenuRow[] {
  const rows: Model.MenuRow[] = (
    (catalog == null ? void 0 : catalog.artists) ?? []
  ).map((l) => ({
    id: l.id,
    title: l.name,
    action: "navigate",
    target: "artist-tracks",
    contextId: l.id,
  }));
  if (rows.length && catalog != null && catalog.songs.length) {
    rows.unshift({
      id: "all",
      title: i18n.t("ASE.Web.IPod.Menu.All"),
      action: "navigate",
      target: "songs",
      screenTitleKey: "ASE.Web.IPod.Menu.AllSongs",
    });
  }
  return rowsOrNoMusic(rows, i18n);
}
function songRows(
  key: Model.SongScreenKey,
): (context: ScreenContext) => Model.MenuRow[] {
  return ({ data, contextId, i18n }) => {
    if (!data) return noMusicRows(i18n);
    const a: Model.MenuRow[] = screenSongs(key, contextId, data).map((n) => ({
      id: n.id,
      title: n.name,
      action: "play",
      songId: n.id,
    }));
    return rowsOrNoMusic(a, i18n);
  };
}
const screens: Record<Model.ScreenKey, ScreenDefinition> = {
  main: {
    view: "list",
    // Product names are usually not localized.
    title: () => "iPod",
    items: mainRows,
    listsNowPlaying: true,
  },
  settings: {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Settings",
    items: settingsRows,
  },
  about: {
    view: "list",
    titleKey: "ASE.Web.IPod.Settings.About",
    items: aboutRows,
    selectHold: {
      ms: brickSelectHoldMs,
      target: "brick",
    },
  },
  backlight: {
    view: "list",
    titleKey: "ASE.Web.IPod.Settings.BacklightTimer",
    items: backlightRows,
  },
  "reset-settings": {
    view: "list",
    titleKey: "ASE.Web.IPod.Settings.ResetAllSettings",
    items: resetRows,
    forgetsSelection: true,
  },
  playlists: {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Playlists",
    items: playlistRows,
  },
  artists: {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Artists",
    items: artistRows,
  },
  songs: {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Songs",
    items: songRows("songs"),
  },
  "playlist-tracks": {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Playlists",
    title: ({ data, contextId }) => {
      var i;
      return (i =
        data == null
          ? void 0
          : data.playlists.find((l) => l.id === contextId)) == null
        ? void 0
        : i.name;
    },
    items: songRows("playlist-tracks"),
  },
  "artist-tracks": {
    view: "list",
    titleKey: "ASE.Web.IPod.Menu.Artists",
    title: ({ data, contextId }) => {
      var i;
      return (i =
        data == null ? void 0 : data.artists.find((l) => l.id === contextId)) ==
        null
        ? void 0
        : i.name;
    },
    items: songRows("artist-tracks"),
  },
  "now-playing": {
    view: "now-playing",
    titleKey: "ASE.Web.IPod.Menu.NowPlaying",
    blocksIdleJump: true,
  },
  brick: {
    view: "brick",
    titleKey: "ASE.Web.IPod.Game.Title",
    blocksIdleJump: true,
  },
};
function screenDefinition(key: Model.ScreenKey): ScreenDefinition {
  return screens[key];
}
function listsNowPlaying(
  key: Model.ScreenKey,
  hasNowPlaying: boolean | undefined,
) {
  return hasNowPlaying && !!screenDefinition(key).listsNowPlaying;
}
function screenItems(screen: Model.ScreenState, context: ScreenContext) {
  var i, l;
  return (
    ((l = (i = screenDefinition(screen.key)).items) == null
      ? void 0
      : l.call(i, {
          ...context,
          contextId: screen.contextId,
        })) ?? []
  );
}
function screenTitle(
  screen: Model.ScreenState,
  catalog: Model.CatalogData | undefined,
  i18n: Model.I18n = defaultI18n,
) {
  var n;
  if (screen.titleKey) return i18n.t(screen.titleKey);
  const definition = screenDefinition(screen.key),
    title =
      (n = definition.title) == null
        ? void 0
        : n.call(definition, {
            data: catalog,
            contextId: screen.contextId,
          });
  return title !== void 0
    ? title
    : definition.titleKey
      ? i18n.t(definition.titleKey)
      : "";
}
function screenId({ key, contextId }: Model.ScreenState) {
  return `${key}:${contextId ?? ""}`;
}
function createSelectionMemory() {
  const selections: Map<
    string,
    {
      itemId: string;
      index: number;
    }
  > = /* @__PURE__ */ new Map();
  let queueSourceId: string | undefined,
    lastQueue: Model.Song[] | undefined,
    lastTrackIndex: number | undefined;
  function syncQueue(
    {
      queue,
      currentTrackIndex,
    }: Pick<Model.PlaybackState, "queue" | "currentTrackIndex">,
    stack: Model.ScreenState[],
  ) {
    if (queue === lastQueue && currentTrackIndex === lastTrackIndex)
      return false;
    lastQueue = queue;
    lastTrackIndex = currentTrackIndex;
    const song = queue[currentTrackIndex];
    if (
      queueSourceId &&
      song &&
      !stack.some((f) => screenId(f) === queueSourceId)
    ) {
      selections.set(queueSourceId, {
        itemId: song.id,
        index: currentTrackIndex,
      });
    }
    return true;
  }
  function remember(
    screen: Model.ScreenState,
    rows: Model.MenuRow[],
    index: number,
  ) {
    const row = rows[index];
    if (!(!row || screenDefinition(screen.key).forgetsSelection)) {
      selections.set(screenId(screen), {
        itemId: row.id,
        index,
      });
    }
  }
  function rememberedIndexIn(screen: Model.ScreenState, rows: Model.MenuRow[]) {
    var row;
    const selection = selections.get(screenId(screen));
    return selection
      ? ((row = rows[selection.index]) == null ? void 0 : row.id) ===
        selection.itemId
        ? selection.index
        : rows.findIndex((f) => f.id === selection.itemId)
      : -1;
  }
  function setQueueSource(screen: Model.ScreenState) {
    queueSourceId = screenId(screen);
  }
  function clearQueueSource() {
    if (queueSourceId) {
      selections.delete(queueSourceId);
      queueSourceId = void 0;
    }
  }
  return {
    syncQueue,
    remember,
    rememberedIndexIn,
    setQueueSource,
    clearQueueSource,
  };
}
const initialVolumeState = {
  isAdjustingVolume: false,
};
function createVolumeController(playback: Model.PlaybackController) {
  const store = writable(initialVolumeState);
  function peek() {
    return getStore(store);
  }
  function l() {
    store.update((c) => ({
      ...c,
      isAdjustingVolume: true,
    }));
  }
  const mode: ReturnType<typeof createTemporaryMode> = createTemporaryMode({
    timeoutMs: volumeIdleTimeoutMs,
    isActive: () => peek().isAdjustingVolume,
    enter: l,
    onLeave: () => store.set(initialVolumeState),
  });
  function enter() {
    mode.restartIdleTimer();
    if (!peek().isAdjustingVolume) {
      l();
    }
  }
  function set(percent: number) {
    const currentPercent = volumeToPercent(getStore(playback).volume),
      clamped = Math.min(100, Math.max(0, percent));
    enter();
    return clamped === currentPercent
      ? false
      : (playback.setVolume(volumeFromPercent(clamped)), true);
  }
  function adjust(steps: number) {
    return set(
      volumeToPercent(getStore(playback).volume) + steps * volumeStepPercent,
    );
  }
  function increase(steps = 1) {
    return adjust(steps);
  }
  function decrease(steps = 1) {
    return adjust(-steps);
  }
  return {
    subscribe: store.subscribe,
    peek,
    increase,
    decrease,
    set,
    keepOpen: mode.keepOpen,
    release: mode.release,
    handleScreenChange: mode.handleScreenChange,
    exit: mode.exit,
    destroy: mode.destroy,
  };
}
export {
  createSeekController,
  createSelectionMemory,
  createVolumeController,
  listsNowPlaying,
  screenDefinition,
  screenItems,
  screenTitle,
};
interface ScreenContext {
  data?: Model.CatalogData;
  i18n: Model.I18n;
  hasNowPlaying?: boolean;
  contextId?: string;
}
interface ScreenDefinition {
  view: "list" | "now-playing" | "brick";
  titleKey?: string;
  title?: (context: Omit<ScreenContext, "i18n">) => string | undefined;
  items?: (context: ScreenContext) => Model.MenuRow[];
  listsNowPlaying?: boolean;
  selectHold?: { ms: number; target: Model.ScreenKey };
  forgetsSelection?: boolean;
  blocksIdleJump?: boolean;
}
