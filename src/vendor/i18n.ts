import type * as Model from "../types.js";
// Translation, catalog lookup, and display formatting.
import { createLogger } from "./environment.js";
import { getContext, readable, setContext, writable } from "./runtime.js";
const englishStrings: Record<string, string> = {
    "ASE.Web.IPod.Menu.Playlists": "Playlists",
    "ASE.Web.IPod.Menu.Artists": "Artists",
    "ASE.Web.IPod.Menu.Songs": "Songs",
    "ASE.Web.IPod.Menu.Settings": "Settings",
    "ASE.Web.IPod.Menu.NowPlaying": "Now Playing",
    "ASE.Web.IPod.Menu.All": "All",
    "ASE.Web.IPod.Menu.AllSongs": "All Songs",
    "ASE.Web.IPod.Menu.NoMusic": "No Music",
    "ASE.Web.IPod.Settings.About": "About",
    "ASE.Web.IPod.Settings.Shuffle": "Shuffle",
    "ASE.Web.IPod.Settings.Repeat": "Repeat",
    "ASE.Web.IPod.Settings.BacklightTimer": "Backlight Timer",
    "ASE.Web.IPod.Settings.Clicker": "Clicker",
    "ASE.Web.IPod.Settings.ResetAllSettings": "Reset All Settings",
    "ASE.Web.IPod.Settings.Value.Off": "Off",
    "ASE.Web.IPod.Settings.Value.On": "On",
    "ASE.Web.IPod.Settings.Value.Songs": "Songs",
    "ASE.Web.IPod.Settings.Value.One": "One",
    "ASE.Web.IPod.Settings.Value.All": "All",
    "ASE.Web.IPod.Backlight.Off": "Off",
    "ASE.Web.IPod.Backlight.OneSecond": "1 second",
    "ASE.Web.IPod.Backlight.TwoSeconds": "2 seconds",
    "ASE.Web.IPod.Backlight.ThreeSeconds": "3 seconds",
    "ASE.Web.IPod.Backlight.FiveSeconds": "5 seconds",
    "ASE.Web.IPod.Backlight.AlwaysOn": "Always On",
    "ASE.Web.IPod.Reset.Cancel": "Cancel",
    "ASE.Web.IPod.Reset.Reset": "Reset",
    "ASE.Web.IPod.About.Songs": "Songs",
    "ASE.Web.IPod.About.Capacity": "Capacity",
    "ASE.Web.IPod.About.Available": "Available",
    "ASE.Web.IPod.About.Version": "Version",
    "ASE.Web.IPod.NowPlaying.Position": "@@index@@ of @@total@@",
    "ASE.Web.IPod.NowPlaying.ShuffleOn": "Shuffle on",
    "ASE.Web.IPod.NowPlaying.RepeatOne": "Repeat one",
    "ASE.Web.IPod.NowPlaying.RepeatAll": "Repeat all",
    "ASE.Web.IPod.NowPlaying.ShuffleOnRepeatOne": "Shuffle on, Repeat one",
    "ASE.Web.IPod.NowPlaying.ShuffleOnRepeatAll": "Shuffle on, Repeat all",
    "ASE.Web.IPod.NowPlaying.PlaybackProgress": "Playback Progress",
    "ASE.Web.IPod.NowPlaying.Volume": "Volume",
    "ASE.Web.IPod.Wheel.Menu": "Menu",
    "ASE.Web.IPod.Wheel.Back": "Back",
    "ASE.Web.IPod.Wheel.Forward": "Forward",
    "ASE.Web.IPod.Wheel.Play": "Play",
    "ASE.Web.IPod.Wheel.Pause": "Pause",
    "ASE.Web.IPod.Wheel.Select": "Select",
    "ASE.Web.IPod.Game.Title": "Brick",
    "ASE.Web.IPod.Game.GameOver": "GAME OVER",
    "ASE.Web.IPod.Game.LaunchBall": "Press Center to Launch Ball",
    "ASE.Web.IPod.Status.Loading": "Loading",
    "ASE.Web.IPod.Status.Ready": "Ready",
    "ASE.Web.IPod.Error.NotConnected": "You are not connected to the internet",
  },
  i18nLogger = createLogger("i18n");
function interpolate(text: string, values?: Model.TranslationValues) {
  return values
    ? text.replace(/@@(\w+)@@/g, (i, l) =>
        l in values ? String(values[l]) : i,
      )
    : text;
}
const defaultLanguage = "en-US";
function canonicalLanguage(language?: string) {
  if (!language) return defaultLanguage;
  try {
    return Intl.getCanonicalLocales(language)[0];
  } catch {
    i18nLogger.warn(`Invalid language "${language}"; using ${defaultLanguage}`);
    return defaultLanguage;
  }
}
function createI18n(host?: Model.HostI18n, language?: string): Model.I18n {
  const canonical = host ? canonicalLanguage(language) : defaultLanguage,
    numberFormats: Map<string, Intl.NumberFormat> = /* @__PURE__ */ new Map(),
    listFormat = new Intl.ListFormat(canonical, {
      style: "long",
      type: "conjunction",
    });
  return {
    t(n, o) {
      if (host)
        try {
          const h = host.t(n, o);
          if (h) return h;
        } catch (error) {
          i18nLogger.error(`Host i18n failed for "${n}"`, error);
        }
      const p = englishStrings[n];
      return p === void 0
        ? (i18nLogger.warn(`No English default for "${n}"`), `**${n}**`)
        : interpolate(p, o);
    },
    formatNumber(n, o) {
      const p = JSON.stringify(o ?? {});
      let h = numberFormats.get(p);
      if (!h) {
        h = new Intl.NumberFormat(canonical, o);
        numberFormats.set(p, h);
      }
      return h.format(n);
    },
    formatList(n) {
      return listFormat.format(n);
    },
  };
}
const defaultI18n = createI18n(),
  i18nContextKey = "i18n";
function provideI18n(): Model.Writable<Model.I18n> {
  const e = writable(defaultI18n);
  setContext(i18nContextKey, e);
  return e;
}
function useI18n(): Model.Readable<Model.I18n> {
  return (
    (getContext(i18nContextKey) as Model.Readable<Model.I18n> | undefined) ??
    readable(defaultI18n)
  );
}
const focusWhenRequested = (e: HTMLElement, t: boolean) => {
    if (t) {
      e.focus({
        preventScroll: true,
      });
    }
  },
  settingLabelKeys: Record<string, string> = {
    off: "ASE.Web.IPod.Settings.Value.Off",
    on: "ASE.Web.IPod.Settings.Value.On",
    songs: "ASE.Web.IPod.Settings.Value.Songs",
    one: "ASE.Web.IPod.Settings.Value.One",
    all: "ASE.Web.IPod.Settings.Value.All",
  };
function settingLabel(e: string, t: Model.I18n = defaultI18n) {
  const i = settingLabelKeys[e];
  return i ? t.t(i) : e;
}
const songIndexCache: WeakMap<
  Model.CatalogData,
  Map<string, Model.Song>
> = /* @__PURE__ */ new WeakMap();
function songIndex(catalog: Model.CatalogData): Map<string, Model.Song> {
  let index = songIndexCache.get(catalog);
  if (!index) {
    index = new Map(catalog.songs.map((i) => [i.id, i]));
    songIndexCache.set(catalog, index);
  }
  return index;
}
function songsByIds(ids: string[], catalog: Model.CatalogData): Model.Song[] {
  const index = songIndex(catalog);
  return ids.map((l) => index.get(l)).filter((l) => !!l);
}
function playableRows(rows: Model.MenuRow[]): Extract<
  Model.MenuRow,
  {
    action: "play";
  }
>[] {
  return rows.filter((t) => t.action === "play");
}
function queueMatchesSongIds(ids: string[], queue: Model.Song[]) {
  return (
    ids.length > 0 &&
    ids.length === queue.length &&
    ids.every((i, l) => {
      var a;
      return i === ((a = queue[l]) == null ? void 0 : a.id);
    })
  );
}
function playingRowIndex(
  rows: Model.MenuRow[],
  {
    queue,
    currentTrackIndex,
  }: Pick<Model.PlaybackState, "queue" | "currentTrackIndex">,
) {
  const playable = playableRows(rows);
  return queueMatchesSongIds(
    playable.map((a) => a.songId),
    queue,
  )
    ? rows.indexOf(playable[currentTrackIndex])
    : -1;
}
function queueFromRows(rows: Model.MenuRow[], catalog: Model.CatalogData) {
  return songsByIds(
    playableRows(rows).map((i) => i.songId),
    catalog,
  );
}
const songScreenKeys = ["songs", "playlist-tracks", "artist-tracks"];
function isSongScreen(key: Model.ScreenKey): key is Model.SongScreenKey {
  return songScreenKeys.includes(key);
}
function screenSongs(
  key: Model.SongScreenKey,
  contextId: string | undefined,
  catalog: Model.CatalogData,
): Model.Song[] {
  const fromCollection = (a: (Model.Artist | Model.Playlist)[]) => {
    var n;
    return songsByIds(
      ((n = a.find((o) => o.id === contextId)) == null ? void 0 : n.songIds) ??
        [],
      catalog,
    );
  };
  switch (key) {
    case "songs":
      return [...catalog.songs];
    case "playlist-tracks":
      return fromCollection(catalog.playlists);
    case "artist-tracks":
      return fromCollection(catalog.artists);
    default:
      return key;
  }
}
function formatTime(seconds: number, i18n: Model.I18n = defaultI18n) {
  const wholeSeconds = Math.max(0, Math.floor(seconds)),
    minutes = i18n.formatNumber(Math.floor(wholeSeconds / 60), {
      useGrouping: false,
    }),
    remainingSeconds = i18n.formatNumber(wholeSeconds % 60, {
      minimumIntegerDigits: 2,
    });
  return `${minutes}:${remainingSeconds}`;
}
function formatRemainingTime(
  currentTime: number,
  duration: number,
  i18n: Model.I18n = defaultI18n,
) {
  return !Number.isFinite(duration) || duration <= 0
    ? ""
    : `-${formatTime(Math.ceil(duration - currentTime), i18n)}`;
}
function formatDuration(seconds: number, i18n: Model.I18n = defaultI18n) {
  const wholeSeconds = Math.max(0, Math.floor(seconds)),
    formatUnit = (n: number, unit: string) =>
      i18n.formatNumber(n, {
        style: "unit",
        unit,
        unitDisplay: "long",
      }),
    parts = (
      [
        [Math.floor(wholeSeconds / 3600), "hour"],
        [Math.floor(wholeSeconds / 60) % 60, "minute"],
        [wholeSeconds % 60, "second"],
      ] as [number, string][]
    )
      .filter(([n]) => n > 0)
      .map(([n, o]) => formatUnit(n, o));
  return parts.length ? i18n.formatList(parts) : formatUnit(0, "second");
}
export {
  createI18n,
  defaultI18n,
  focusWhenRequested,
  formatDuration,
  formatRemainingTime,
  formatTime,
  isSongScreen,
  playableRows,
  playingRowIndex,
  provideI18n,
  queueFromRows,
  screenSongs,
  settingLabel,
  useI18n,
};
