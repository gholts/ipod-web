import type * as Model from "../types.js";
// Persisted preferences and backlight behavior.
import { createLogger } from "./environment.js";
import { getStore, writable } from "./runtime.js";
var ShuffleMode = {
    OFF: "off",
    SONGS: "songs",
  } as const,
  RepeatMode = {
    OFF: "off",
    ONE: "one",
    ALL: "all",
  } as const,
  BacklightMode = {
    OFF: "off",
    SEC_1: "1sec",
    SEC_2: "2sec",
    SEC_3: "3sec",
    SEC_5: "5sec",
    ALWAYS_ON: "always_on",
  } as const;
const backlightOptions: {
  mode: Model.BacklightMode;
  labelKey: string;
  durationMs?: number;
}[] = [
  {
    mode: "off",
    labelKey: "ASE.Web.IPod.Backlight.Off",
  },
  {
    mode: "1sec",
    labelKey: "ASE.Web.IPod.Backlight.OneSecond",
    durationMs: 1e3,
  },
  {
    mode: "2sec",
    labelKey: "ASE.Web.IPod.Backlight.TwoSeconds",
    durationMs: 2e3,
  },
  {
    mode: "3sec",
    labelKey: "ASE.Web.IPod.Backlight.ThreeSeconds",
    durationMs: 3e3,
  },
  {
    mode: "5sec",
    labelKey: "ASE.Web.IPod.Backlight.FiveSeconds",
    durationMs: 5e3,
  },
  {
    mode: "always_on",
    labelKey: "ASE.Web.IPod.Backlight.AlwaysOn",
  },
];
var ClickerMode = {
  OFF: "off",
  ON: "on",
} as const;
const defaultLocale: Model.Locale = {
    storefront: "us",
    language: "en-US",
  },
  settingsStorageKey = "apple-ipod:settings",
  startupMinDisplayMs = 2e3,
  startupMaxHoldMs = 1e4,
  defaultDragStepDegrees = 15,
  keyboardStepDegrees = 15,
  wheelDiameter = 350,
  wheelInnerDiameterPercent = (100 / wheelDiameter) * 100,
  wheelOuterDiameterPercent = (276 / wheelDiameter) * 100,
  nowPlayingIdleDelayMs = 1e4,
  menuHoldMs = 1e3,
  buttonHoldMs = 500,
  heldSeekSteps = [5, 5, 5, 10, 10, 10, 20],
  seekStepSeconds = 1,
  seekCommitDelayMs = 1e3,
  seekIdleTimeoutMs = 5e3,
  listAcceleration = {
    minSpeed: 180,
    tierMs: 500,
    tiers: [1, 2, 3, 5, 8, 13, 21, 34],
    // rows per click
  },
  seekAcceleration = {
    minSpeed: 180,
    tierMs: 500,
    tiers: [1, 2, 3, 5],
    // SEEK_STEP_SECONDS per click
  },
  maxAccelerationSpeed = 400,
  maxMeasuredSpeed = Math.min(
    listAcceleration.minSpeed,
    seekAcceleration.minSpeed,
  ),
  speedSmoothing = 0.15,
  keyRepeatDelayMs = 300,
  keyRepeatIntervalMs = 80,
  keySeekStepSeconds = 5,
  volumeStepPercent = 1,
  volumeIdleTimeoutMs = 5e3,
  volumeSaveDelayMs = 1e3,
  volumeStepDegrees = (1.25 * 360) / 100,
  volumeClickDegrees = (1.25 * 360) / 22,
  brickSelectHoldMs = 5e3,
  paddleTurnDegrees = 360,
  paddleTurnScale = 0.035,
  settingsLogger = createLogger("<Settings>");
var darkSchemeMatchMedia: typeof window.matchMedia | undefined;
const darkScheme =
  typeof window > "u" || (darkSchemeMatchMedia = window.matchMedia) == null
    ? void 0
    : darkSchemeMatchMedia.call(window, "(prefers-color-scheme: dark)");
function defaultBacklight(): Model.BacklightMode {
  return darkScheme != null && darkScheme.matches
    ? BacklightMode.ALWAYS_ON
    : BacklightMode.OFF;
}
const defaultSettings: Readonly<Model.Settings> = Object.freeze({
  shuffle: ShuffleMode.OFF,
  repeat: RepeatMode.OFF,
  clicker: ClickerMode.ON,
  backlight: defaultBacklight(),
  volume: 50,
});
function isEnumValue<T extends string>(
  enumeration: Record<string, T>,
  value: unknown,
): value is T {
  return Object.values(enumeration).includes(value as T);
}
function isValidVolume(value: unknown): value is number {
  return (
    typeof value == "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}
function sanitizeSettings(input?: StoredSettings | null): Model.Settings {
  const saved = input ?? {};
  return {
    shuffle: isEnumValue(ShuffleMode, saved.shuffle)
      ? saved.shuffle
      : defaultSettings.shuffle,
    repeat: isEnumValue(RepeatMode, saved.repeat)
      ? saved.repeat
      : defaultSettings.repeat,
    clicker: isEnumValue(ClickerMode, saved.clicker)
      ? saved.clicker
      : defaultSettings.clicker,
    backlight: isEnumValue(BacklightMode, saved.backlight)
      ? saved.backlight
      : defaultSettings.backlight,
    volume: isValidVolume(saved.volume) ? saved.volume : defaultSettings.volume,
  };
}
let backlightChosen = false;
function readSettings(): Model.Settings {
  try {
    const stored = localStorage.getItem(settingsStorageKey),
      parsed: StoredSettings | null | undefined =
        stored === null ? void 0 : JSON.parse(stored),
      savedSettings = parsed;
    backlightChosen =
      (savedSettings == null ? void 0 : savedSettings.backlightChosen) ===
        true && isEnumValue(BacklightMode, savedSettings!.backlight);
    const validated =
      parsed === void 0 ? defaultSettings : sanitizeSettings(parsed);
    return backlightChosen
      ? validated
      : {
          ...validated,
          backlight: defaultBacklight(),
        };
  } catch (error) {
    settingsLogger.error("Failed to read settings from localStorage", error);
    return defaultSettings;
  }
}
function saveSettings({ backlight, ...otherSettings }: Model.Settings) {
  try {
    localStorage.setItem(
      settingsStorageKey,
      JSON.stringify(
        backlightChosen
          ? {
              ...otherSettings,
              backlight,
              backlightChosen: true,
            }
          : otherSettings,
      ),
    );
  } catch (error) {
    settingsLogger.error("Failed to write settings to localStorage", error);
  }
}
const settings: Model.Writable<Model.Settings> = writable(readSettings());
settings.subscribe(saveSettings);
const resetListeners: Set<() => void> = /* @__PURE__ */ new Set();
function onSettingsReset(listener: () => void) {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}
function setBacklight(mode: Model.BacklightMode) {
  backlightChosen = true;
  settings.update((t) => ({
    ...t,
    backlight: mode,
  }));
}
if (!(darkScheme == null)) {
  darkScheme.addEventListener("change", () => {
    if (!backlightChosen) {
      settings.update((e) => ({
        ...e,
        backlight: defaultBacklight(),
      }));
    }
  });
}
function resetSettings() {
  backlightChosen = false;
  settings.set({
    ...defaultSettings,
    backlight: defaultBacklight(),
  });
  resetListeners.forEach((e) => e());
}
const backlightDurations = new Map(
  backlightOptions.map(({ mode, durationMs }) => [mode, durationMs]),
);
function createBacklight() {
  let mode = getStore(settings).backlight;
  const store = writable(mode === BacklightMode.ALWAYS_ON);
  let timeout: ReturnType<typeof setTimeout> | undefined,
    forcedOn = false,
    forcedOff = false,
    wasLit = mode === BacklightMode.ALWAYS_ON;
  function clearTimer() {
    clearTimeout(timeout);
    timeout = void 0;
  }
  function notifyActivity() {
    wasLit = getStore(store);
    if (forcedOn) return;
    if (forcedOff) {
      forcedOff = false;
      store.set(mode === BacklightMode.ALWAYS_ON);
    }
    const c = backlightDurations.get(mode);
    if (c !== void 0) {
      clearTimer();
      store.set(true);
      timeout = setTimeout(() => {
        timeout = void 0;
        store.set(false);
      }, c);
    }
  }
  function toggle() {
    clearTimer();
    forcedOn = !wasLit;
    forcedOff = wasLit;
    wasLit = forcedOn;
    store.set(forcedOn);
  }
  const unsubscribe = settings.subscribe(({ backlight }) => {
    if (backlight !== mode) {
      mode = backlight;
      forcedOn = false;
      forcedOff = false;
      clearTimer();
      if (mode === BacklightMode.ALWAYS_ON) {
        store.set(true);
      } else {
        if (mode === BacklightMode.OFF) {
          store.set(false);
        } else {
          notifyActivity();
        }
      }
    }
  });
  return {
    subscribe: store.subscribe,
    notifyActivity,
    toggle,
    destroy() {
      clearTimer();
      unsubscribe();
    },
  };
}
export {
  ClickerMode,
  RepeatMode,
  ShuffleMode,
  backlightOptions,
  brickSelectHoldMs,
  buttonHoldMs,
  createBacklight,
  defaultDragStepDegrees,
  defaultLocale,
  heldSeekSteps,
  keyRepeatDelayMs,
  keyRepeatIntervalMs,
  keySeekStepSeconds,
  keyboardStepDegrees,
  listAcceleration,
  maxAccelerationSpeed,
  maxMeasuredSpeed,
  menuHoldMs,
  nowPlayingIdleDelayMs,
  onSettingsReset,
  paddleTurnDegrees,
  paddleTurnScale,
  resetSettings,
  seekAcceleration,
  seekCommitDelayMs,
  seekIdleTimeoutMs,
  seekStepSeconds,
  setBacklight,
  settings,
  speedSmoothing,
  startupMaxHoldMs,
  startupMinDisplayMs,
  volumeClickDegrees,
  volumeIdleTimeoutMs,
  volumeSaveDelayMs,
  volumeStepDegrees,
  volumeStepPercent,
  wheelInnerDiameterPercent,
  wheelOuterDiameterPercent,
};

type StoredSettings = Partial<Record<keyof Model.Settings, unknown>> & {
  backlightChosen?: unknown;
};
