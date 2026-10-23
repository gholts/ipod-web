export type Storefront = "us" | "jp";
export interface Locale {
  storefront: Storefront;
  language: string;
}
export interface Song {
  id: string;
  name: string;
  artistName: string;
  artistIds: string[];
  previewUrl: string;
  albumName: string;
  durationInMillis: number;
  playParams?: { id: string; kind: string };
  url?: string;
}
export interface Artist {
  id: string;
  name: string;
  songIds: string[];
  url?: string;
}
export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  url?: string;
}
export interface CatalogData {
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
}
export interface Catalog extends CatalogData {
  schemaVersion: number;
  storefront: Storefront;
  language: string;
}
export type CatalogState =
  | { status: "loading" }
  | { status: "ready"; language: string; data: CatalogData }
  | { status: "error"; error: unknown };
export type Unsubscribe = () => void;
export type Subscriber<T> = (value: T) => void;
export interface Readable<T> {
  subscribe(run: Subscriber<T>, invalidate?: () => void): Unsubscribe;
}
export interface Writable<T> extends Readable<T> {
  set(value: T): void;
  update(update: (value: T) => T): void;
}
type ShuffleMode = "off" | "songs";
export type RepeatMode = "off" | "one" | "all";
export type PlayerRepeatMode = "none" | "one" | "all";
type ClickerMode = "off" | "on";
export type BacklightMode =
  "off" | "1sec" | "2sec" | "3sec" | "5sec" | "always_on";
export interface Settings {
  shuffle: ShuffleMode;
  repeat: RepeatMode;
  clicker: ClickerMode;
  backlight: BacklightMode;
  volume: number;
}
export interface HostI18n {
  t(key: string, values?: Record<string, string | number>): string | undefined;
}
export interface I18n {
  t(key: string, values?: Record<string, string | number>): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatList(values: string[]): string;
}
export interface QueueItem {
  trackId: string;
  previewUrl: string;
}
export interface PlayerStores {
  isPlaying: Readable<boolean>;
  currentPlaybackTime: Readable<number>;
  currentPlaybackDuration: Readable<number>;
  hasLoadedItem: Readable<boolean>;
  shuffleMode: Readable<boolean>;
  repeatMode: Readable<PlayerRepeatMode>;
  volume: Readable<number>;
  queuePosition?: Readable<number>;
}
type PlaybackResult = void | Promise<void>;
export interface HostPlayback extends PlayerStores {
  currentItemIndex: Readable<number>;
  setQueue(ids: string[]): PlaybackResult;
  resume(): PlaybackResult;
  pause(): PlaybackResult;
  seekToTime(time: number, index?: number): PlaybackResult;
  skipToNextItem(): PlaybackResult;
  skipToPreviousItem(): PlaybackResult;
  changeToQueueItem(id: string, index: number): PlaybackResult;
  setShuffle(enabled: boolean): Promise<void>;
  setRepeatMode(mode: PlayerRepeatMode): Promise<void>;
  setVolume(volume: number): PlaybackResult;
  clearQueue(): PlaybackResult;
}
export interface Player extends PlayerStores {
  setQueue(): PlaybackResult;
  resume(): PlaybackResult;
  pause(): PlaybackResult;
  seekToTime(time: number, index?: number): PlaybackResult;
  skipToNextItem(): PlaybackResult;
  skipToPreviousItem(): PlaybackResult;
  changeToQueueItem(id: string, index: number): PlaybackResult;
  setShuffle(enabled: boolean): Promise<void>;
  setRepeatMode(mode: PlayerRepeatMode): Promise<void>;
  setVolume(volume: number): PlaybackResult;
  destroy(): void;
}
export interface PlaybackState {
  isPlaying: boolean;
  currentPlaybackTime: number;
  currentPlaybackDuration: number;
  currentTrackIndex: number;
  queuePosition: number;
  queue: Song[];
  hasLoadedItem: boolean;
  isLoading: boolean;
  volume: number;
  shuffleMode: boolean;
  repeatMode: PlayerRepeatMode;
  playerReady: boolean;
}
export interface PlaybackController extends Readable<PlaybackState> {
  play(queue: Song[], index?: number): Promise<void> | undefined;
  pause(): Promise<void>;
  resume(): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  seek(time: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  setRepeatMode(mode: PlayerRepeatMode): Promise<void>;
  setPlayback(host?: HostPlayback): void;
  clearQueue(): Promise<void>;
  onQueueFinished(listener: () => void): Unsubscribe;
  destroy(): void;
}
export type ScreenKey =
  | "main"
  | "settings"
  | "about"
  | "backlight"
  | "reset-settings"
  | "playlists"
  | "artists"
  | "songs"
  | "playlist-tracks"
  | "artist-tracks"
  | "now-playing"
  | "brick";
export interface ScreenState {
  key: ScreenKey;
  contextId?: string;
  titleKey?: string;
  selectedItemId?: string;
  selectedIndexAtPush?: number;
  scrollTopAtPush?: number;
  suppressNowPlayingSyncAtPush?: boolean;
}
interface RowBase {
  id: string;
  title: string;
  value?: string;
  centered?: boolean;
}
export type MenuRow = RowBase &
  (
    | { action: "info" | "cancel" | "reset-all" }
    | {
        action: "navigate";
        target: ScreenKey;
        contextId?: string;
        screenTitleKey?: string;
      }
    | { action: "toggle"; target: BacklightMode }
    | {
        action: "inline-toggle";
        toggleKey: "shuffle" | "repeat" | "clicker";
        values: string[];
      }
    | { action: "play"; songId: string }
  );
export type ScrollTarget = "list" | "seek" | "volume" | "brick";
export interface WheelScrollDetail {
  step: number;
  degrees: number;
  speed: number;
}
export interface HeldSeekDetail {
  repeat: boolean;
}
export interface BrickBall {
  x: number;
  y: number;
  dx: number;
  dy: number;
}
export interface Brick {
  x: number;
  y: number;
  destroyed: boolean;
}
export interface GameState {
  paddleX: number;
  ball: BrickBall;
  isBallInPlay: boolean;
  serveTicks: number;
  bricks: Brick[];
  score: number;
  balls: number;
  level: number;
  isGameOver: boolean;
}
export interface Lcd {
  width: number;
  height: number;
  drive: Uint8Array;
  ink: Float32Array;
  fade(elapsedMs: number): boolean;
  settle(): void;
}
export type TranslationValues = Record<string, string | number>;
export interface IPodElement extends HTMLElement {
  locale: Locale;
  dragStepDegrees?: number;
  backlit?: boolean | string;
  playback?: HostPlayback;
  navigateToUrl?: (url: string, event?: Event) => void;
  i18n?: HostI18n;
  readonly iPodDataStore: Readable<CatalogState> | undefined;
}
export type SongScreenKey = "songs" | "playlist-tracks" | "artist-tracks";
