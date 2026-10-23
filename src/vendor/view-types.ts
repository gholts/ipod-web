import type * as Model from "../types.js";
import type {
  createSeekController,
  createVolumeController,
} from "./navigation.js";

export type Navigate = (url: string) => unknown;
export type IconProps = Record<string, unknown>;
export type HeaderProps = {
  title: string;
  hasLoadedItem: boolean;
  isPlaying: boolean;
  isBrick?: boolean;
  brickBalls?: number;
  brickScore?: number;
};
export type ListProps = {
  items: Model.MenuRow[];
  selectedIndex: number;
  navigationId: number;
  shouldFocus: boolean;
  restoredScrollTop?: number;
};
export type MarqueeProps = { text: string; resetKey?: string };
export type ProgressProps = {
  value: number;
  max: number;
  testId: string;
  variant?: "fill" | "marker";
  label?: string;
  valuetext?: string;
  disabled?: boolean;
};
export type NowPlayingProps = {
  songIndex: number;
  songCount: number;
  songId?: string;
  title?: string;
  titleUrl?: string;
  navigateToUrl?: Navigate;
  artistName?: string;
  albumName?: string;
  currentTime?: number;
  duration?: number;
  isSeeking?: boolean;
  seekPreviewTime?: number;
  isAdjustingVolume?: boolean;
  volume?: number;
  isPositionDisabled?: boolean;
  shuffleMode?: boolean;
  repeatMode?: Model.PlayerRepeatMode;
  shouldFocus?: boolean;
};
export type BrickProps = { paused?: boolean; score?: number; balls?: number };
export type MenuProps = {
  data?: Model.CatalogData;
  playback: Model.PlaybackController;
  navigateToUrl?: Navigate;
  disabled?: boolean;
  scrollTarget?: Model.ScrollTarget;
  selectHoldMs?: number | null;
};
export type WheelProps = {
  selectButtonDiameterPercent?: number;
  scrollWheelDiameterPercent?: number;
  disableSkip?: boolean;
  disabled?: boolean;
  scrollTarget?: Model.ScrollTarget;
  isPlaying?: boolean;
  selectHoldMs?: number | null;
};
export type OfflineProps = { message: string };
export type DeviceProps = {
  locale?: Model.Locale;
  dragStepDegrees?: number;
  backlit?: boolean | string;
  playback?: Model.HostPlayback;
  navigateToUrl?: Navigate;
  i18n?: Model.HostI18n;
};
export interface BrickHandle {
  movePaddle(amount: number): void;
  steerPaddle(direction: number): void;
  launchBall(): void;
}
export interface MenuHandle {
  seekController: ReturnType<typeof createSeekController>;
  volumeController: ReturnType<typeof createVolumeController>;
  currentScrollTarget(): Model.ScrollTarget;
  back(): void;
  selectHold(): void;
  turnPaddle(degrees: number): void;
  steerPaddle(direction?: number | null): void;
  notifyActivity(): void;
  accelerate(speed: number, direction: number): number;
  moveBy(direction: number, steps?: number): boolean;
  keyStep(direction: number, heldMs: number): boolean;
  select(): void;
  play(): void;
}
export type WheelButton = "menu" | "select" | "back" | "forward" | "playpause";
export type WheelAction =
  | { kind: "none" }
  | { kind: "scroll"; step: number }
  | { kind: "steer"; step: number }
  | { kind: "press"; button: WheelButton }
  | {
      kind: "hold";
      button: WheelButton;
      duration?: number;
      repeatInterval?: number;
    };
