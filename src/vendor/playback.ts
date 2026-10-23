import type * as Model from "../types.js";
// Preview audio, queue playback, host integration, and click sounds.
import { createLogger } from "./environment.js";
import { getStore, onDestroy, tick, writable } from "./runtime.js";
import { RepeatMode } from "./settings.js";
import { catalogs } from "../data.js";
const catalogSchemaVersion = 3;
async function loadCatalog({ storefront }: Model.Locale) {
  const catalog = catalogs[storefront];
  if (catalog.schemaVersion !== catalogSchemaVersion)
    throw new Error(
      `Unsupported iPod data schema version for "${storefront}": expected ${catalogSchemaVersion}, got ${catalog.schemaVersion}`,
    );
  const { songs, artists, playlists } = catalog;
  return {
    language: catalog.language,
    data: {
      songs,
      artists,
      playlists,
    },
  };
}
function createCatalogStore() {
  const store = writable<Model.CatalogState>({
    status: "loading",
  });
  let generation = 0;
  async function loadIPodData(locale: Model.Locale) {
    const request = ++generation;
    store.set({
      status: "loading",
    });
    try {
      const { language, data } = await loadCatalog(locale);
      if (request === generation) {
        store.set({
          status: "ready",
          language,
          data,
        });
      }
    } catch (error) {
      if (request === generation) {
        store.set({
          status: "error",
          error,
        });
      }
    }
  }
  return {
    iPodData: store,
    loadIPodData,
  };
}
const previewLogger = createLogger("<Html5PreviewPlayer>"),
  crossfadeSeconds = 2,
  fadeCurveSamples = 50,
  previousTrackRestartSeconds = 3;
function fadeInGain(progress: number) {
  return Math.cos((1 - progress) * Math.PI * 0.5);
}
function fadeOutGain(progress: number) {
  return Math.cos(progress * Math.PI * 0.5);
}
function gainCurve(gainAt: (progress: number) => number, samples: number) {
  return Float32Array.from(
    {
      length: samples,
    },
    (i, l) => gainAt(l / (samples - 1)),
  );
}
const fadeInCurve = gainCurve(fadeInGain, fadeCurveSamples),
  fadeOutCurve = gainCurve(fadeOutGain, fadeCurveSamples);
function shuffled(items: number[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
class PreviewChannel {
  declare fadeDoneTimeout: ReturnType<typeof setTimeout> | undefined;
  declare sourceNode: MediaElementAudioSourceNode;
  declare gainNode: GainNode;
  declare context: AudioContext;
  declare audio: HTMLAudioElement;
  constructor(
    context: AudioContext,
    item: Model.QueueItem,
    destination: AudioNode,
  ) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.crossOrigin = "anonymous";
    this.audio.src = item.previewUrl;
    this.context = context;
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 0;
    this.sourceNode = context.createMediaElementSource(this.audio);
    this.sourceNode.connect(this.gainNode).connect(destination);
  }
  cancelPendingFade() {
    clearTimeout(this.fadeDoneTimeout);
    this.gainNode.gain.cancelScheduledValues(this.context.currentTime);
  }
  runFade(curve: Float32Array<ArrayBuffer>, onComplete?: () => void) {
    this.cancelPendingFade();
    this.gainNode.gain.setValueCurveAtTime(
      curve,
      this.context.currentTime,
      crossfadeSeconds,
    );
    if (onComplete) {
      this.fadeDoneTimeout = setTimeout(onComplete, crossfadeSeconds * 1e3);
    }
  }
  fadeIn() {
    this.runFade(fadeInCurve);
  }
  fadeOut(onComplete?: () => void) {
    this.runFade(fadeOutCurve, onComplete);
  }
  cutIn() {
    this.cancelPendingFade();
    this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
  }
  destroy() {
    clearTimeout(this.fadeDoneTimeout);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.sourceNode.disconnect();
    this.gainNode.disconnect();
  }
}
class PreviewPlayer {
  declare repeatMode: Model.Writable<Model.PlayerRepeatMode>;
  declare repeatModeStore: Model.Writable<Model.PlayerRepeatMode>;
  declare queuePositionStore: Model.Writable<number>;
  declare queuePosition: Model.Writable<number>;
  declare volumeStore: Model.Writable<number>;
  declare volume: Model.Writable<number>;
  declare currentPlaybackDurationStore: Model.Writable<number>;
  declare currentPlaybackDuration: Model.Writable<number>;
  declare currentPlaybackTimeStore: Model.Writable<number>;
  declare currentPlaybackTime: Model.Writable<number>;
  declare shuffleModeStore: Model.Writable<boolean>;
  declare shuffleMode: Model.Writable<boolean>;
  declare hasLoadedItemStore: Model.Writable<boolean>;
  declare hasLoadedItem: Model.Writable<boolean>;
  declare isPlayingStore: Model.Writable<boolean>;
  declare isPlaying: Model.Writable<boolean>;
  declare pendingCrossfadeFrom:
    | {
        channel: PreviewChannel;
        index: number;
      }
    | undefined;
  declare displayChannel: PreviewChannel | undefined;
  declare nextIndex: number | undefined;
  declare nextChannel: PreviewChannel | undefined;
  declare currentChannel: PreviewChannel | undefined;
  declare volumeGainNode: GainNode;
  declare onQueueAdvance: ((index: number) => void) | undefined;
  declare context: AudioContext;
  declare items: Model.QueueItem[];
  declare fadingOutChannels: Set<PreviewChannel>;
  declare playOrder: number[];
  declare currentRepeatMode: Model.PlayerRepeatMode;
  declare isShuffled: boolean;
  declare hasTriggeredFadeForCurrent: boolean;
  declare currentIndex: number;
  constructor(
    items: Model.QueueItem[],
    context: AudioContext,
    onQueueAdvance?: (index: number) => void,
    {
      shuffle = false,
      repeatMode = "none",
    }: {
      shuffle?: boolean;
      repeatMode?: Model.PlayerRepeatMode;
    } = {},
  ) {
    this.currentIndex = 0;
    this.hasTriggeredFadeForCurrent = false;
    this.isShuffled = false;
    this.currentRepeatMode = "none";
    this.playOrder = [];
    this.fadingOutChannels = /* @__PURE__ */ new Set();
    this.isPlayingStore = writable(false);
    this.currentPlaybackTimeStore = writable(0);
    this.currentPlaybackDurationStore = writable(0);
    this.hasLoadedItemStore = writable(false);
    this.shuffleModeStore = writable(false);
    this.repeatModeStore = writable("none");
    this.volumeStore = writable(1);
    this.queuePositionStore = writable(0);
    this.isPlaying = this.isPlayingStore;
    this.currentPlaybackTime = this.currentPlaybackTimeStore;
    this.currentPlaybackDuration = this.currentPlaybackDurationStore;
    this.hasLoadedItem = this.hasLoadedItemStore;
    this.shuffleMode = this.shuffleModeStore;
    this.repeatMode = this.repeatModeStore;
    this.volume = this.volumeStore;
    this.queuePosition = this.queuePositionStore;
    this.items = items;
    this.context = context;
    this.onQueueAdvance = onQueueAdvance;
    this.volumeGainNode = context.createGain();
    this.volumeGainNode.connect(context.destination);
    this.isShuffled = shuffle;
    this.shuffleModeStore.set(shuffle);
    this.currentRepeatMode = repeatMode;
    this.repeatModeStore.set(repeatMode);
  }
  // Sets a queue with index 0 as a default, but changeToQueueItem()
  // is what will actually load the correct starting item.
  async setQueue() {
    this.destroyActiveChannels();
    this.currentIndex = 0;
    this.hasTriggeredFadeForCurrent = false;
    this.queuePositionStore.set(0);
  }
  destroyActiveChannels() {
    var channel;
    if (!((channel = this.currentChannel) == null)) {
      channel.destroy();
    }
    this.clearNextChannel();
    this.setCurrentChannel(void 0);
    this.displayChannel = void 0;
  }
  clearNextChannel() {
    var channel;
    if (!((channel = this.nextChannel) == null)) {
      channel.destroy();
    }
    this.nextChannel = void 0;
    this.nextIndex = void 0;
  }
  makeNextChannelCurrent() {
    this.setCurrentChannel(this.nextChannel);
    this.nextChannel = void 0;
    this.nextIndex = void 0;
  }
  destroyFadingChannels() {
    this.fadingOutChannels.forEach((t) => t.destroy());
    this.fadingOutChannels.clear();
  }
  // Keeps hasLoadedItem in sync with currentChannel everywhere the latter
  // is reassigned, rather than relying on each call site to remember to.
  setCurrentChannel(channel?: PreviewChannel) {
    this.currentChannel = channel;
    this.hasLoadedItemStore.set(!!channel);
  }
  // A channel wraps one queue item's audio node. Like a DJ's two turntables,
  // there are two at a time: the one currently playing, and the one cued
  // up next.
  createChannel(index: number) {
    const item = this.items[index];
    if (!item) return;
    const channel = new PreviewChannel(this.context, item, this.volumeGainNode);
    this.bindChannelEvents(channel);
    return channel;
  }
  // Picks up duration as soon as it's known. Skips the write once it's unchanged.
  setDuration(audio: HTMLAudioElement) {
    if (
      Number.isFinite(audio.duration) &&
      audio.duration !== getStore(this.currentPlaybackDurationStore)
    ) {
      this.currentPlaybackDurationStore.set(audio.duration);
    }
  }
  // Duration is 0 until the channel reports its own, rather than showing
  // the previous track's.
  syncStoresToChannel(channel?: PreviewChannel) {
    this.currentPlaybackTimeStore.set(
      (channel == null ? void 0 : channel.audio.currentTime) ?? 0,
    );
    this.currentPlaybackDurationStore.set(
      channel && Number.isFinite(channel.audio.duration)
        ? channel.audio.duration
        : 0,
    );
  }
  // Runs from timeupdate, or as the fallback when no timeupdate will fire.
  promoteToDisplayIfNeeded(channel: PreviewChannel) {
    var onQueueAdvance;
    if (channel !== this.displayChannel) {
      this.displayChannel = channel;
      this.syncStoresToChannel(channel);
      if (!((onQueueAdvance = this.onQueueAdvance) == null)) {
        onQueueAdvance.call(this, this.currentIndex);
      }
      this.syncQueuePosition();
      this.pendingCrossfadeFrom = void 0;
    }
  }
  // Identifies still-active channel by reference, not by index.
  // An index can point at both the outgoing and incoming channels
  // at once (repeat-one crossfades a track into a new instance of itself).
  bindChannelEvents(channel: PreviewChannel) {
    channel.audio.addEventListener("durationchange", () => {
      if (channel === this.displayChannel) {
        this.setDuration(channel.audio);
      }
    });
    channel.audio.addEventListener("timeupdate", () => {
      if (
        channel === this.currentChannel &&
        channel.audio.currentTime >= crossfadeSeconds / 2
      ) {
        this.promoteToDisplayIfNeeded(channel);
      }
      if (channel === this.displayChannel) {
        this.currentPlaybackTimeStore.set(channel.audio.currentTime);
        this.setDuration(channel.audio);
      }
      if (channel !== this.currentChannel) return;
      const { currentTime, duration } = channel.audio;
      if (!(
        !Number.isFinite(duration) ||
        duration <= crossfadeSeconds ||
        this.hasTriggeredFadeForCurrent ||
        currentTime < duration - crossfadeSeconds
      )) {
        this.hasTriggeredFadeForCurrent = true;
        if (this.nextChannel) {
          this.crossfadeToNext();
        } else {
          channel.fadeOut();
        }
      }
    });
    channel.audio.addEventListener("ended", () => {
      if (channel === this.currentChannel) {
        this.promoteToDisplayIfNeeded(channel);
        if (this.nextChannel) {
          this.crossfadeToNext();
          return;
        }
        this.endQueue();
      }
    });
  }
  endQueue() {
    this.destroyActiveChannels();
    this.destroyFadingChannels();
    this.pendingCrossfadeFrom = void 0;
    this.isPlayingStore.set(false);
    this.syncStoresToChannel(void 0);
  }
  // What plays right after `fromIndex` if nobody intervenes -- loops the
  // same track for repeat-one, otherwise the next adjacent index.
  computeAutoAdvanceIndex(fromIndex: number) {
    return this.currentRepeatMode === "one"
      ? fromIndex
      : this.computeAdjacentIndex(fromIndex, 1);
  }
  // Lags currentIndex during a not-yet-promoted crossfade.
  displayedIndex() {
    var crossfade;
    return (
      ((crossfade = this.pendingCrossfadeFrom) == null
        ? void 0
        : crossfade.index) ?? this.currentIndex
    );
  }
  syncQueuePosition(index: number = this.currentIndex) {
    this.queuePositionStore.set(
      this.isShuffled ? this.playOrder.indexOf(index) : index,
    );
  }
  // What manual skip targets -- always a different track (repeat-one never gets here).
  computeAdjacentIndex(fromIndex: number, step: number) {
    if (!this.isShuffled) {
      const index = fromIndex + step;
      return index >= 0 && index < this.items.length
        ? index
        : this.currentRepeatMode !== "all"
          ? void 0
          : step === 1
            ? 0
            : this.items.length - 1;
    }
    const position = this.playOrder.indexOf(fromIndex) + step;
    if (position >= 0 && position < this.playOrder.length)
      return this.playOrder[position];
    if (this.currentRepeatMode !== "all") return;
    const wrappedPosition = step === 1 ? 0 : this.playOrder.length - 1;
    return this.playOrder[wrappedPosition];
  }
  // Destroys/rebuilds nextChannel from the current index + shuffle/repeat
  // state. Called whenever any of those inputs change, like when a DJ cues up
  // a new record on the second turntable.
  prepareNextChannel() {
    if (!this.currentChannel) return;
    const index = this.computeAutoAdvanceIndex(this.currentIndex);
    if (index !== this.nextIndex) {
      this.clearNextChannel();
      if (index !== void 0) {
        this.nextIndex = index;
        this.nextChannel = this.createChannel(index);
      }
    }
  }
  // The display (and queuePosition) switch later, in next's timeupdate.
  crossfadeToNext() {
    const outgoing = this.currentChannel,
      incoming = this.nextChannel;
    if (!(!outgoing || !incoming || this.nextIndex === void 0)) {
      this.pendingCrossfadeFrom ??
        (this.pendingCrossfadeFrom = {
          channel: outgoing,
          index: this.currentIndex,
        });
      outgoing.fadeOut(() => {
        var l;
        outgoing.destroy();
        this.fadingOutChannels.delete(outgoing);
        if (
          ((l = this.pendingCrossfadeFrom) == null ? void 0 : l.channel) ===
          outgoing
        ) {
          this.pendingCrossfadeFrom = void 0;
          if (this.currentChannel) {
            this.promoteToDisplayIfNeeded(this.currentChannel);
          }
        } else {
          if (incoming === this.currentChannel) {
            this.promoteToDisplayIfNeeded(incoming);
          }
        }
      });
      this.fadingOutChannels.add(outgoing);
      incoming.audio.play().catch((l) => {
        previewLogger.error("Failed to play next track during crossfade", l);
        if (incoming === this.currentChannel) {
          this.isPlayingStore.set(false);
          this.promoteToDisplayIfNeeded(incoming);
        }
      });
      incoming.fadeIn();
      this.currentIndex = this.nextIndex;
      this.makeNextChannelCurrent();
      this.hasTriggeredFadeForCurrent = false;
      this.prepareNextChannel();
    }
  }
  // Reverts a still-in-flight, not-yet-promoted crossfade, if one is
  // pending.  Handles seeking to a point right before a crossfade, letting
  // it start, then commiting to a seek after it's started but not yet shown.
  revertPendingCrossfade() {
    var channel;
    const crossfade = this.pendingCrossfadeFrom;
    if (crossfade) {
      this.pendingCrossfadeFrom = void 0;
      if (!((channel = this.currentChannel) == null)) {
        channel.destroy();
      }
      crossfade.channel.cutIn();
      this.fadingOutChannels.delete(crossfade.channel);
      this.destroyFadingChannels();
      this.currentIndex = crossfade.index;
      this.setCurrentChannel(crossfade.channel);
      this.clearNextChannel();
      this.hasTriggeredFadeForCurrent = false;
      this.syncQueuePosition();
      this.prepareNextChannel();
    }
  }
  async resume() {
    const channel = this.currentChannel;
    if (!channel) {
      await this.jumpTo(this.currentIndex, {
        forceResume: true,
      });
      return;
    }
    await channel.audio.play();
    channel.cutIn();
    this.hasTriggeredFadeForCurrent = false;
    this.isPlayingStore.set(true);
  }
  async pause() {
    var channel;
    if (!((channel = this.currentChannel) == null)) {
      channel.audio.pause();
    }
    this.fadingOutChannels.forEach((i) => i.audio.pause());
    this.isPlayingStore.set(false);
  }
  // Repeat-one locks Next and Back to the current track
  restartIfRepeatOne() {
    return this.currentRepeatMode !== "one"
      ? false
      : (this.currentChannel && this.restartInPlace(this.currentChannel), true);
  }
  async skipToNextItem() {
    if (this.restartIfRepeatOne()) return;
    const index = this.computeAdjacentIndex(this.currentIndex, 1);
    if (index !== void 0) {
      await this.jumpTo(index);
      return;
    }
    if (!this.pendingCrossfadeFrom && this.currentChannel) {
      this.endQueue();
    }
  }
  // If playing a track past a certain point, restart it instead of skipping.
  // Otherwise skip to previous track (paused/within threshold), or end the
  // queue if there's no previous track to go to.
  async skipToPreviousItem() {
    if (this.restartIfRepeatOne()) return;
    const channel = this.currentChannel,
      isPlaying = getStore(this.isPlayingStore);
    if (
      channel &&
      isPlaying &&
      channel.audio.currentTime > previousTrackRestartSeconds
    ) {
      this.restartInPlace(channel);
      return;
    }
    const index = this.computeAdjacentIndex(this.currentIndex, -1);
    if (index !== void 0) {
      await this.jumpTo(index);
      return;
    }
    if (!this.pendingCrossfadeFrom) {
      if (channel) {
        this.endQueue();
      }
    }
  }
  restartInPlace(channel: PreviewChannel) {
    channel.audio.currentTime = 0;
    channel.cutIn();
    this.hasTriggeredFadeForCurrent = false;
    this.pendingCrossfadeFrom = void 0;
    this.syncStoresToChannel(channel);
  }
  async changeToQueueItem(trackId: string, index: number) {
    await this.jumpTo(index, {
      forceResume: true,
    });
  }
  async jumpTo(
    index: number,
    {
      forceResume = false,
    }: {
      forceResume?: boolean;
    } = {},
  ) {
    var outgoing, previous, onQueueAdvance;
    if (
      // Only a no-op if we're already there with something loaded
      // -- setQueue() no longer eagerly loads index 0, so the very
      // first jumpTo(0) still needs to build a channel.
      (index === this.currentIndex && this.currentChannel) ||
      index < 0 ||
      index >= this.items.length
    )
      return;
    const shouldResume = forceResume || getStore(this.isPlayingStore);
    this.pendingCrossfadeFrom = void 0;
    if (index === this.nextIndex && this.nextChannel) {
      if (!((outgoing = this.currentChannel) == null)) {
        outgoing.destroy();
      }
      this.makeNextChannelCurrent();
    } else {
      if (!((previous = this.currentChannel) == null)) {
        previous.destroy();
      }
      this.clearNextChannel();
      this.setCurrentChannel(this.createChannel(index));
    }
    this.displayChannel = this.currentChannel;
    this.syncStoresToChannel(this.currentChannel);
    this.currentIndex = index;
    this.hasTriggeredFadeForCurrent = false;
    if (this.isShuffled && this.playOrder.length === 0) {
      this.buildPlayOrder([index]);
    }
    this.syncQueuePosition();
    this.prepareNextChannel();
    if (!((onQueueAdvance = this.onQueueAdvance) == null)) {
      onQueueAdvance.call(this, this.currentIndex);
    }
    if (shouldResume) {
      await this.resume();
    }
  }
  async seekToTime(time: number, index?: number) {
    var crossfade;
    if (
      (index !== void 0 &&
        index !== this.currentIndex &&
        index !==
          ((crossfade = this.pendingCrossfadeFrom) == null
            ? void 0
            : crossfade.index)) ||
      (this.revertPendingCrossfade(),
      index !== void 0 && index !== this.currentIndex)
    )
      return;
    const channel = this.currentChannel;
    if (!channel) return;
    const { duration } = channel.audio,
      nextIndex = this.computeAutoAdvanceIndex(this.currentIndex);
    if (
      Number.isFinite(duration) &&
      duration > crossfadeSeconds &&
      time >= duration - crossfadeSeconds &&
      nextIndex !== void 0
    ) {
      if (nextIndex === this.currentIndex) {
        this.restartInPlace(channel);
      } else {
        await this.skipToNextItem();
      }
      return;
    }
    channel.audio.currentTime = time;
    channel.cutIn();
    this.hasTriggeredFadeForCurrent = false;
    if (channel === this.displayChannel) {
      this.currentPlaybackTimeStore.set(time);
    }
  }
  async setShuffle(enabled: boolean) {
    if (enabled === this.isShuffled) return;
    this.isShuffled = enabled;
    const displayedIndex = this.displayedIndex();
    if (enabled) {
      this.buildPlayOrder(
        this.currentIndex === displayedIndex
          ? [displayedIndex]
          : [displayedIndex, this.currentIndex],
      );
    }
    this.shuffleModeStore.set(enabled);
    this.syncQueuePosition(displayedIndex);
    this.prepareNextChannel();
  }
  buildPlayOrder(pinnedIndices: number[]) {
    const otherIndices = this.items
      .map((l, a) => a)
      .filter((l) => !pinnedIndices.includes(l));
    this.playOrder = [...pinnedIndices, ...shuffled(otherIndices)];
  }
  async setRepeatMode(mode: Model.PlayerRepeatMode) {
    if (mode !== this.currentRepeatMode) {
      this.currentRepeatMode = mode;
      this.repeatModeStore.set(mode);
      this.prepareNextChannel();
    }
  }
  async setVolume(volume: number) {
    const clamped = Math.min(1, Math.max(0, volume));
    this.volumeGainNode.gain.setTargetAtTime(
      clamped,
      this.context.currentTime,
      0.01,
    );
    this.volumeStore.set(clamped);
  }
  destroy() {
    this.destroyActiveChannels();
    this.destroyFadingChannels();
    this.volumeGainNode.disconnect();
  }
}
function hostPlayerAdapter(
  queue: Model.QueueItem[],
  host: Model.HostPlayback,
  onTrackChange?: (index: number) => void,
): Model.Player {
  const unsubscribe = onTrackChange
    ? host.currentItemIndex.subscribe(onTrackChange)
    : void 0;
  return {
    setQueue: () => host.setQueue(queue.map((a) => a.trackId)),
    resume: () => host.resume(),
    pause: () => host.pause(),
    seekToTime: (a, n) => host.seekToTime(a, n),
    skipToNextItem: () => host.skipToNextItem(),
    skipToPreviousItem: () => host.skipToPreviousItem(),
    changeToQueueItem: (a, n) => host.changeToQueueItem(a, n),
    setShuffle: (a) => host.setShuffle(a),
    setRepeatMode: (a) => host.setRepeatMode(a),
    setVolume: (a) => host.setVolume(a),
    isPlaying: host.isPlaying,
    currentPlaybackTime: host.currentPlaybackTime,
    currentPlaybackDuration: host.currentPlaybackDuration,
    hasLoadedItem: host.hasLoadedItem,
    shuffleMode: host.shuffleMode,
    repeatMode: host.repeatMode,
    volume: host.volume,
    queuePosition: host.queuePosition ?? host.currentItemIndex,
    // Only unsubscribes our own listener
    destroy: () => (unsubscribe == null ? void 0 : unsubscribe()),
  };
}
function createPlayer(
  queue: Model.QueueItem[],
  context: AudioContext,
  host: Model.HostPlayback | undefined,
  onTrackChange: ((index: number) => void) | undefined,
  options: {
    shuffle?: boolean;
    repeatMode?: Model.PlayerRepeatMode;
  },
): Model.Player {
  return host
    ? hostPlayerAdapter(queue, host, onTrackChange)
    : new PreviewPlayer(queue, context, onTrackChange, options);
}
const initialPlaybackState: Model.PlaybackState = {
  isPlaying: false,
  currentPlaybackTime: 0,
  currentPlaybackDuration: 0,
  currentTrackIndex: 0,
  queuePosition: 0,
  queue: [],
  hasLoadedItem: false,
  isLoading: false,
  volume: 1,
  shuffleMode: false,
  repeatMode: "none",
  playerReady: false,
};
function playbackTrackId(song: Model.Song) {
  var params;
  return ((params = song.playParams) == null ? void 0 : params.id) ?? song.id;
}
const playerStoreKeys: (keyof Omit<Model.PlayerStores, "volume">)[] = [
  "isPlaying",
  "currentPlaybackTime",
  "currentPlaybackDuration",
  "hasLoadedItem",
  "shuffleMode",
  "repeatMode",
  "queuePosition",
];
function createPlaybackStore(context: AudioContext): Model.PlaybackController {
  function allowPreview() {
    if (navigator.onLine) return true;
    playbackAllowed.set(false);
    return false;
  }
  const logger = createLogger("<PlaybackStore>"),
    store = writable(initialPlaybackState);
  let host: Model.HostPlayback | undefined,
    player: Model.Player | undefined,
    shuffle: boolean = false,
    repeatMode: Model.PlayerRepeatMode = "none",
    pendingVolumeChanges = 0,
    subscriptions: Model.Unsubscribe[] = [],
    queueFinishedListeners: (() => void)[] = [];
  function onQueueFinished(listener: () => void) {
    queueFinishedListeners.push(listener);
    return () => {
      queueFinishedListeners = queueFinishedListeners.filter(
        (V) => V !== listener,
      );
    };
  }
  function destroyPlayer() {
    subscriptions.forEach((P) => P());
    subscriptions = [];
    try {
      if (!(player == null)) {
        player.destroy();
      }
    } finally {
      player = void 0;
      store.update((P) => ({
        ...P,
        playerReady: false,
      }));
    }
  }
  let queueAbort: AbortController | undefined,
    commands: Promise<void> = Promise.resolve();
  function controlFailed(error: unknown) {
    logger.error("Playback control failed", error);
  }
  function enqueueCommand(command: () => Promise<void> | void) {
    commands = commands.then(async () => {
      try {
        await (command() ?? Promise.resolve());
      } catch (error) {
        controlFailed(error);
      }
    });
    return commands;
  }
  function clearQueue() {
    if (!(queueAbort == null)) {
      queueAbort.abort();
    }
    store.update((P) => ({
      ...P,
      queue: [],
      currentTrackIndex: 0,
      queuePosition: 0,
      hasLoadedItem: false,
      isPlaying: false,
      isLoading: false,
    }));
    return enqueueCommand(
      () => (destroyPlayer(), host == null ? void 0 : host.clearQueue()),
    );
  }
  function subscribePlayerStore(
    key: keyof Model.PlayerStores,
    playerStore: Model.Readable<boolean | number | Model.PlayerRepeatMode>,
  ) {
    return playerStore.subscribe((q) =>
      store.update((Q) => ({
        ...Q,
        [key]: q,
      })),
    );
  }
  function watchQueueFinished(player: Model.Player, signal: AbortSignal) {
    let previouslyLoaded = false;
    return player.hasLoadedItem.subscribe((Q) => {
      if (
        previouslyLoaded &&
        !Q &&
        !signal.aborted &&
        getStore(store).queue.length > 0
      ) {
        clearQueue();
        queueFinishedListeners.forEach((O) => {
          try {
            O();
          } catch (error) {
            logger.error("onQueueFinished listener failed", error);
          }
        });
      }
      previouslyLoaded = Q;
    });
  }
  function connectPlayerStores(player: Model.Player, signal: AbortSignal) {
    const playerStores = player;
    subscriptions = [];
    subscriptions.push(watchQueueFinished(player, signal));
    for (const Q of playerStoreKeys)
      subscriptions.push(subscribePlayerStore(Q, playerStores[Q]!));
    subscriptions.push(
      player.volume.subscribe((volume) => {
        if (!(pendingVolumeChanges > 0)) {
          store.update((O) => ({
            ...O,
            volume,
          }));
        }
      }),
    );
    store.update((Q) => ({
      ...Q,
      playerReady: true,
    }));
  }
  async function updateVolume(volume: number, update: () => Promise<void>) {
    pendingVolumeChanges += 1;
    store.update((q) => ({
      ...q,
      volume,
    }));
    try {
      await update();
    } finally {
      pendingVolumeChanges -= 1;
    }
  }
  function setPlayerVolume(volume: number) {
    return updateVolume(volume, async () => {
      try {
        await (player == null ? void 0 : player.setVolume(volume));
      } catch (error) {
        controlFailed(error);
      }
    });
  }
  function onTrackChange(index: number) {
    store.update((V) =>
      index < 0 || index >= V.queue.length
        ? (logger.warn("Ignoring out-of-range queue advance index:", index), V)
        : {
            ...V,
            currentTrackIndex: index,
          },
    );
  }
  async function startQueue(
    queue: Model.Song[],
    index: number,
    resume: boolean,
  ) {
    if (!allowPreview()) return;
    if (!(queueAbort == null)) {
      queueAbort.abort();
    }
    const abort = new AbortController();
    queueAbort = abort;
    const queueShuffle = shuffle,
      queueRepeat = repeatMode,
      items = queue.map((F) => ({
        trackId: playbackTrackId(F),
        previewUrl: F.previewUrl,
      }));
    store.update((F) => ({
      ...F,
      queue,
      currentTrackIndex: index,
      // Shuffle pins the chosen song first, at position 0.
      queuePosition: queueShuffle ? 0 : index,
      isLoading: true,
    }));
    const load = async () => {
      var F;
      if (!abort.signal.aborted)
        try {
          destroyPlayer();
          const tt = createPlayer(items, context, host, onTrackChange, {
            shuffle: queueShuffle,
            repeatMode: queueRepeat,
          });
          player = tt;
          setPlayerVolume(getStore(store).volume);
          await tt.setQueue();
          if (
            abort.signal.aborted ||
            (await tt.changeToQueueItem(
              ((F = items[index]) == null ? void 0 : F.trackId) ?? "",
              index,
            ),
            abort.signal.aborted) ||
            (await Promise.all([
              tt.setShuffle(queueShuffle).catch(controlFailed),
              tt.setRepeatMode(queueRepeat).catch(controlFailed),
            ]),
            abort.signal.aborted) ||
            (resume ? await tt.resume() : await tt.pause(),
            abort.signal.aborted)
          )
            return;
          setPlayerVolume(getStore(store).volume);
          connectPlayerStores(tt, abort.signal);
        } catch (error) {
          if (!abort.signal.aborted) {
            logger.error("Failed to start playback", error);
          }
        } finally {
          if (!abort.signal.aborted) {
            store.update((tt) => ({
              ...tt,
              isLoading: false,
            }));
          }
        }
    };
    commands = commands.then(load);
    return commands;
  }
  function play(queue: Model.Song[], requestedIndex?: number) {
    if (queue.length === 0) return Promise.resolve();
    const index =
      requestedIndex ??
      (shuffle ? Math.floor(Math.random() * queue.length) : 0);
    return startQueue(queue, index, true);
  }
  function pause() {
    return enqueueCommand(() => (player == null ? void 0 : player.pause()));
  }
  function resume() {
    return enqueueCommand(() =>
      player && allowPreview() ? player.resume() : void 0,
    );
  }
  function skipNext() {
    return enqueueCommand(() =>
      player && allowPreview() ? player.skipToNextItem() : void 0,
    );
  }
  function skipPrevious() {
    return enqueueCommand(() =>
      player && allowPreview() ? player.skipToPreviousItem() : void 0,
    );
  }
  function seek(time: number) {
    const index = getStore(store).currentTrackIndex;
    return enqueueCommand(() =>
      player == null ? void 0 : player.seekToTime(time, index),
    );
  }
  function setVolume(volume: number) {
    return updateVolume(volume, () =>
      enqueueCommand(() =>
        player == null ? void 0 : player.setVolume(volume),
      ),
    );
  }
  function setShuffle(enabled: boolean) {
    shuffle = enabled;
    return enqueueCommand(() =>
      player == null ? void 0 : player.setShuffle(enabled),
    );
  }
  function setRepeatMode(mode: Model.PlayerRepeatMode) {
    repeatMode = mode;
    return enqueueCommand(() =>
      player == null ? void 0 : player.setRepeatMode(mode),
    );
  }
  function setPlayback(nextHost?: Model.HostPlayback) {
    if (nextHost === host) return;
    host = nextHost;
    const { queue, currentTrackIndex: index, isPlaying } = getStore(store);
    if (queue.length !== 0) {
      startQueue(queue, index, isPlaying);
    }
  }
  function destroy() {
    if (!(queueAbort == null)) {
      queueAbort.abort();
    }
    destroyPlayer();
  }
  return {
    subscribe: store.subscribe,
    play,
    pause,
    resume,
    skipNext,
    skipPrevious,
    seek,
    setVolume,
    setShuffle,
    setRepeatMode,
    setPlayback,
    clearQueue,
    onQueueFinished,
    destroy,
  };
}
function createAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)();
}
function closeAudioOnDestroy(context: AudioContext) {
  onDestroy(() => {
    context.close().catch(() => {});
  });
}
function audioNeedsResume(state: AudioContextState) {
  return state !== "running" && state !== "closed";
}
const pendingAudioResumes: WeakMap<
    AudioContext,
    Promise<void>
  > = /* @__PURE__ */ new WeakMap(),
  audioResumeTimeoutMs = 1e3;
function resumeAudio(context: AudioContext) {
  if (!audioNeedsResume(context.state) || pendingAudioResumes.has(context))
    return;
  let settled = false;
  const finish = () => {
    if (!settled) {
      settled = true;
      pendingAudioResumes.delete(context);
    }
  };
  pendingAudioResumes.set(
    context,
    context
      .resume()
      .catch(() => {})
      .finally(finish),
  );
  setTimeout(() => {
    if (!settled) {
      finish();
    }
  }, audioResumeTimeoutMs);
}
const clickGain = 0.3,
  clickSpacingSeconds = 0.05,
  maxClickQueueSeconds = 0.15,
  clickResumeDelaySeconds = 0.08,
  clickResumeMaxAgeMs = 200;
function createClickSound(url: string, context: AudioContext) {
  const logger = createLogger("<ClickSoundPlayer>"),
    gain = context.createGain();
  gain.gain.value = clickGain;
  gain.connect(context.destination);
  let buffer: AudioBuffer | null = null,
    nextClickAt: number = 0,
    pendingClickAt: number | null = null;
  async function load() {
    try {
      const d = await (await fetch(url)).arrayBuffer();
      buffer = await context.decodeAudioData(d);
      logger.debug("Click sound loaded successfully");
    } catch (error) {
      logger.error("Failed to load or decode click sound", error);
    }
  }
  load();
  function scheduleClick() {
    if (!buffer) return;
    const { currentTime } = context;
    if (nextClickAt - currentTime >= maxClickQueueSeconds) return;
    const d = Math.max(currentTime, nextClickAt);
    try {
      const A = context.createBufferSource();
      A.buffer = buffer;
      A.connect(gain);
      A.start(d);
      nextClickAt = d + clickSpacingSeconds;
    } catch (error) {
      logger.error("Error during click sound playback", error);
    }
  }
  context.addEventListener("statechange", () => {
    if (
      context.state !== "running" ||
      ((nextClickAt = Math.max(
        nextClickAt,
        context.currentTime + clickResumeDelaySeconds,
      )),
      pendingClickAt === null)
    )
      return;
    const c = Date.now() - pendingClickAt > clickResumeMaxAgeMs;
    pendingClickAt = null;
    if (!c) {
      scheduleClick();
    }
  });
  function playClick() {
    if (context.state !== "running") {
      resumeAudio(context);
      if (pendingClickAt === null) {
        pendingClickAt = Date.now();
      }
      return;
    }
    scheduleClick();
  }
  return {
    playClick,
  };
}
const clickSoundUrl = new URL("../assets/click.wav", import.meta.url).href;
class DestroyedError extends Error {
  constructor() {
    super("component was destroyed before tick resolved.");
    this.name = "DestroyedError";
  }
}
const runUntilDestroyed = () => {
    let e = false;
    onDestroy(() => {
      e = true;
    });
    return async (t: (tick: () => Promise<void>) => Promise<void>) => {
      try {
        await t(async () => {
          await tick();
          if (e) throw new DestroyedError();
        });
      } catch (error) {
        if (!(error instanceof DestroyedError)) throw error;
      }
    };
  },
  playbackAllowed = writable(true),
  playerRepeatModes: Record<Model.RepeatMode, Model.PlayerRepeatMode> = {
    [RepeatMode.OFF]: "none",
    [RepeatMode.ONE]: "one",
    [RepeatMode.ALL]: "all",
  };
export {
  clickSoundUrl,
  closeAudioOnDestroy,
  createAudioContext,
  createCatalogStore,
  createClickSound,
  createPlaybackStore,
  playbackAllowed,
  playerRepeatModes,
  resumeAudio,
  runUntilDestroyed,
};
