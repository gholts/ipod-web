import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type {
  MarqueeProps,
  ProgressProps,
  NowPlayingProps,
} from "../view-types.js";
import { NowPlayingSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  checkOutros,
  createEventDispatcher,
  createFragment,
  createSvelteCustomElement,
  destroyComponent,
  detach,
  element,
  empty,
  flush,
  actionDestroyer,
  groupOutros,
  initComponent,
  insert,
  isFunction,
  mountComponent,
  safeNotEqual,
  setData,
  space,
  subscribeComponent,
  text,
  toggleClass,
  transitionIn,
  transitionOut,
} from "../runtime.js";
import {
  focusWhenRequested,
  formatDuration,
  formatRemainingTime,
  formatTime,
  useI18n,
} from "../i18n.js";
import { linkNavigation } from "./link.js";
import { Marquee } from "./marquee.js";
import { ProgressBar } from "./progress.js";
import {
  RepeatAllIcon,
  RepeatOneIcon,
  ShuffleModeIcon,
  VolumeHighIcon,
  VolumeLowIcon,
} from "./icons.js";
import { nowPlayingCss } from "./styles.js";
type Context = ReturnType<typeof nowPlayingInstance>;
function nowPlayingStyles(root: DomParent) {
  appendStyles(root, "svelte-w35jhk", nowPlayingCss);
}
function renderPlayModes(context: Context) {
  let playModifier: HTMLDivElement,
    index: number,
    block: {
      create(): void;
      mount(block: DomParent, spacer: Node | null): void;
      intro(block?: TransitionFlag): void;
      outro(block?: TransitionFlag): void;
      destroy(block?: TransitionFlag): void;
    } | null,
    spacer: Text,
    spacer2: Text,
    active: boolean;
  const branches = [renderRepeatOne, renderRepeatAll],
    blocks: (ReturnType<typeof renderRepeatAll> | null)[] = [];
  function selectBranch(context2: Context, dirty?: unknown) {
    return context2[NowPlayingSlot.repeatMode] === "one"
      ? 0
      : context2[NowPlayingSlot.repeatMode] === "all"
        ? 1
        : -1;
  }
  if (~(index = selectBranch(context))) {
    block = blocks[index] = branches[index](context);
  }
  let shuffleBlock:
    ReturnType<typeof renderShuffle> | null | false | "" | undefined =
    context[NowPlayingSlot.shuffleMode] && renderShuffle();
  return {
    create() {
      playModifier = element("div");
      if (block) {
        block.create();
      }
      spacer = space();
      if (shuffleBlock) {
        shuffleBlock.create();
      }
      spacer2 = space();
      attr(playModifier, "class", "play-modifier svelte-w35jhk");
      attr(playModifier, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, playModifier, anchor);
      if (~index) {
        blocks[index]!.mount(playModifier, null);
      }
      append(playModifier, spacer);
      if (shuffleBlock) {
        shuffleBlock.mount(playModifier, null);
      }
      insert(target, spacer2, anchor);
      active = true;
    },
    update(nextContext: Context, dirty: number[]) {
      let previousIndex = index;
      index = selectBranch(nextContext);
      if (index !== previousIndex) {
        if (block) {
          groupOutros();
          transitionOut(blocks[previousIndex], 1, 1, () => {
            blocks[previousIndex] = null;
          });
          checkOutros();
        }
        if (~index) {
          block = blocks[index];
          if (!block) {
            block = blocks[index] = branches[index](nextContext);
            block.create();
          }
          transitionIn(block, 1);
          block.mount(playModifier, spacer);
        } else {
          block = null;
        }
      }
      if (nextContext[NowPlayingSlot.shuffleMode]) {
        if (shuffleBlock) {
          if (dirty[0] & (1 << NowPlayingSlot.shuffleMode)) {
            transitionIn(shuffleBlock, 1);
          }
        } else {
          shuffleBlock = renderShuffle();
          shuffleBlock.create();
          transitionIn(shuffleBlock, 1);
          shuffleBlock.mount(playModifier, null);
        }
      } else if (shuffleBlock) {
        groupOutros();
        transitionOut(shuffleBlock, 1, 1, () => {
          shuffleBlock = null;
        });
        checkOutros();
      }
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(block);
        transitionIn(shuffleBlock);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(block);
      transitionOut(shuffleBlock);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(playModifier);
        detach(spacer2);
      }
      if (~index) {
        blocks[index]!.destroy();
      }
      if (shuffleBlock) {
        shuffleBlock.destroy();
      }
    },
  };
}
function renderRepeatAll(context?: Context) {
  let repeatAllIcon: InstanceType<typeof RepeatAllIcon>, active: boolean;
  repeatAllIcon = new RepeatAllIcon({
    props: {
      class: "repeat-all-icon",
    },
  });
  return {
    create() {
      createFragment(repeatAllIcon.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(repeatAllIcon, target, anchor);
      active = true;
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(repeatAllIcon.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(repeatAllIcon.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(repeatAllIcon, detaching);
    },
  };
}
function renderRepeatOne(context?: Context) {
  let repeatOneIcon: InstanceType<typeof RepeatOneIcon>, active: boolean;
  repeatOneIcon = new RepeatOneIcon({
    props: {
      class: "repeat-one-icon",
    },
  });
  return {
    create() {
      createFragment(repeatOneIcon.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(repeatOneIcon, target, anchor);
      active = true;
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(repeatOneIcon.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(repeatOneIcon.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(repeatOneIcon, detaching);
    },
  };
}
function renderShuffle(context?: Context) {
  let shuffleModeIcon: InstanceType<typeof ShuffleModeIcon>, active: boolean;
  shuffleModeIcon = new ShuffleModeIcon({
    props: {
      class: "shuffle-icon",
    },
  });
  return {
    create() {
      createFragment(shuffleModeIcon.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(shuffleModeIcon, target, anchor);
      active = true;
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(shuffleModeIcon.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(shuffleModeIcon.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(shuffleModeIcon, detaching);
    },
  };
}
function renderPlayModeLabel(context: Context) {
  let visuallyHidden: HTMLSpanElement, playModesLabelText: Text;
  return {
    create() {
      visuallyHidden = element("span");
      playModesLabelText = text(context[NowPlayingSlot.playModesLabel]);
      attr(visuallyHidden, "class", "visually-hidden svelte-w35jhk");
      attr(visuallyHidden, "data-testid", "now-playing-play-modes");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, visuallyHidden, anchor);
      append(visuallyHidden, playModesLabelText);
    },
    update(nextContext: Context, dirty: number[]) {
      if (dirty[0] & (1 << NowPlayingSlot.playModesLabel)) {
        setData(playModesLabelText, nextContext[NowPlayingSlot.playModesLabel]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(visuallyHidden);
      }
    },
  };
}
function renderSongTitle(context: Context) {
  let songTitle: HTMLDivElement,
    index: number,
    block:
      | ReturnType<typeof renderPlainTitle>
      | ReturnType<typeof renderLinkedTitle>
      | null,
    active: boolean;
  const branches = [renderLinkedTitle, renderPlainTitle],
    blocks: (
      | ReturnType<typeof renderPlainTitle>
      | ReturnType<typeof renderLinkedTitle>
      | null
    )[] = [];
  function selectBranch(context2: Context, dirty?: unknown) {
    return context2[NowPlayingSlot.titleUrl] ? 0 : 1;
  }
  index = selectBranch(context);
  block = blocks[index] = branches[index](context);
  return {
    create() {
      songTitle = element("div");
      block!.create();
      attr(songTitle, "class", "song-title svelte-w35jhk");
      attr(songTitle, "data-testid", "now-playing-song-title");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, songTitle, anchor);
      blocks[index]!.mount(songTitle, null);
      active = true;
    },
    update(nextContext: Context, dirty: number[]) {
      let previousIndex = index;
      index = selectBranch(nextContext);
      if (index === previousIndex) {
        blocks[index]!.update(nextContext, dirty);
      } else {
        groupOutros();
        transitionOut(blocks[previousIndex], 1, 1, () => {
          blocks[previousIndex] = null;
        });
        checkOutros();
        block = blocks[index];
        if (block) {
          block.update(nextContext, dirty);
        } else {
          block = blocks[index] = branches[index](nextContext);
          block!.create();
        }
        transitionIn(block, 1);
        block.mount(songTitle, null);
      }
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(block);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(block);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(songTitle);
      }
      blocks[index]!.destroy();
    },
  };
}
function renderPlainTitle(context: Context) {
  let marquee: Marquee, active: boolean;
  marquee = new Marquee({
    props: {
      text: context[NowPlayingSlot.title]!,
      resetKey: context[NowPlayingSlot.songId],
    },
  });
  return {
    create() {
      createFragment(marquee.$$.fragment);
    },
    mount(target: DomParent, anchor: Node | null) {
      mountComponent(marquee, target, anchor);
      active = true;
    },
    update(nextContext: Context, dirty: number[]) {
      const attributes: Partial<MarqueeProps> = {};
      if (dirty[0] & (1 << NowPlayingSlot.title)) {
        attributes.text = nextContext[NowPlayingSlot.title];
      }
      if (dirty[0] & (1 << NowPlayingSlot.songId)) {
        attributes.resetKey = nextContext[NowPlayingSlot.songId];
      }
      marquee.$set(attributes);
    },
    intro(local?: TransitionFlag) {
      if (!active) {
        transitionIn(marquee.$$.fragment, local);
        active = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(marquee.$$.fragment, local);
      active = false;
    },
    destroy(detaching?: TransitionFlag) {
      destroyComponent(marquee, detaching);
    },
  };
}
function renderLinkedTitle(context: Context) {
  let songTitleLink: HTMLAnchorElement,
    marquee: Marquee,
    navigation: ReturnType<typeof linkNavigation>,
    current: boolean,
    listening: boolean,
    dispose: () => void;
  marquee = new Marquee({
    props: {
      text: context[NowPlayingSlot.title]!,
      resetKey: context[NowPlayingSlot.songId],
    },
  });
  return {
    create() {
      songTitleLink = element("a");
      createFragment(marquee.$$.fragment);
      attr(songTitleLink, "class", "song-title-link svelte-w35jhk");
      attr(songTitleLink, "href", context[NowPlayingSlot.titleUrl]);
      attr(songTitleLink, "data-testid", "now-playing-song-link");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, songTitleLink, anchor);
      mountComponent(marquee, songTitleLink, null);
      current = true;
      if (!listening) {
        dispose = actionDestroyer(
          (navigation = linkNavigation.call(
            null,
            songTitleLink,
            context[NowPlayingSlot.navigateToUrl],
          )),
        );
        listening = true;
      }
    },
    update(nextContext: Context, dirty: number[]) {
      const attributes: Partial<MarqueeProps> = {};
      if (dirty[0] & (1 << NowPlayingSlot.title)) {
        attributes.text = nextContext[NowPlayingSlot.title];
      }
      if (dirty[0] & (1 << NowPlayingSlot.songId)) {
        attributes.resetKey = nextContext[NowPlayingSlot.songId];
      }
      marquee.$set(attributes);
      if (!current || dirty[0] & (1 << NowPlayingSlot.titleUrl)) {
        attr(songTitleLink, "href", nextContext[NowPlayingSlot.titleUrl]);
      }
      if (
        navigation &&
        isFunction(navigation.update) &&
        dirty[0] & (1 << NowPlayingSlot.navigateToUrl)
      ) {
        navigation.update.call(null, nextContext[NowPlayingSlot.navigateToUrl]);
      }
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(marquee.$$.fragment, local);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(marquee.$$.fragment, local);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(songTitleLink);
      }
      destroyComponent(marquee);
      listening = false;
      dispose();
    },
  };
}
function renderArtist(context: Context) {
  let artist: HTMLDivElement, artistNameText: Text;
  return {
    create() {
      artist = element("div");
      artistNameText = text(context[NowPlayingSlot.artistName]);
      attr(artist, "class", "artist svelte-w35jhk");
      attr(artist, "data-testid", "now-playing-artist");
      attr(artist, "dir", "auto");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, artist, anchor);
      append(artist, artistNameText);
    },
    update(nextContext: Context, dirty: number[]) {
      if (dirty[0] & (1 << NowPlayingSlot.artistName)) {
        setData(artistNameText, nextContext[NowPlayingSlot.artistName]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(artist);
      }
    },
  };
}
function renderAlbum(context: Context) {
  let album: HTMLDivElement, albumNameText: Text;
  return {
    create() {
      album = element("div");
      albumNameText = text(context[NowPlayingSlot.albumName]);
      attr(album, "class", "album svelte-w35jhk");
      attr(album, "data-testid", "now-playing-album");
      attr(album, "dir", "auto");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, album, anchor);
      append(album, albumNameText);
    },
    update(nextContext: Context, dirty: number[]) {
      if (dirty[0] & (1 << NowPlayingSlot.albumName)) {
        setData(albumNameText, nextContext[NowPlayingSlot.albumName]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(album);
      }
    },
  };
}
function renderNowPlaying(context: Context) {
  let nowPlaying: HTMLDivElement,
    nowPlayingIndex: HTMLDivElement,
    span: HTMLSpanElement,
    positionText: Text,
    anchor: Text,
    spacer: Text,
    nowPlayingInfo: HTMLDivElement,
    spacer2: Text,
    spacer3: Text,
    spacer4: Text,
    nowPlayingProgress: HTMLDivElement,
    timeAndProgress: HTMLDivElement,
    playbackProgress: ProgressBar,
    spacer5: Text,
    progressLabels: HTMLDivElement,
    span2: HTMLSpanElement,
    elapsedTimeText: Text,
    spacer6: Text,
    span3: HTMLSpanElement,
    remainingTimeText: Text,
    spacer7: Text,
    scrubbingIndicator: HTMLDivElement,
    scrubControl: ProgressBar,
    spacer8: Text,
    progressLabels2: HTMLDivElement,
    span4: HTMLSpanElement,
    elapsedTimeText2: Text,
    spacer9: Text,
    span5: HTMLSpanElement,
    remainingTimeText2: Text,
    spacer10: Text,
    volumeLabels: HTMLDivElement,
    volumeLowIcon: InstanceType<typeof VolumeLowIcon>,
    spacer11: Text,
    volumeControl: ProgressBar,
    spacer12: Text,
    volumeHighIcon: InstanceType<typeof VolumeHighIcon>,
    current: boolean,
    focused: boolean,
    playModes: ReturnType<typeof renderPlayModes> | null | false =
      (context[NowPlayingSlot.shuffleMode] ||
        context[NowPlayingSlot.repeatMode] !== "none") &&
      renderPlayModes(context),
    playModeLabel:
      ReturnType<typeof renderPlayModeLabel> | null | false | "" | undefined =
      context[NowPlayingSlot.playModesLabel] && renderPlayModeLabel(context),
    songTitle:
      ReturnType<typeof renderSongTitle> | null | false | "" | undefined =
      context[NowPlayingSlot.title] && renderSongTitle(context),
    artist: ReturnType<typeof renderArtist> | null | false | "" | undefined =
      context[NowPlayingSlot.artistName] && renderArtist(context),
    album: ReturnType<typeof renderAlbum> | null | false | "" | undefined =
      context[NowPlayingSlot.albumName] && renderAlbum(context);
  playbackProgress = new ProgressBar({
    props: {
      value: context[NowPlayingSlot.displayTime],
      max: context[NowPlayingSlot.duration],
      testId: "now-playing-progress",
    },
  });
  scrubControl = new ProgressBar({
    props: {
      variant: "marker",
      value: context[NowPlayingSlot.roundedTime],
      max: context[NowPlayingSlot.duration],
      disabled: context[NowPlayingSlot.isPositionDisabled],
      label: context[NowPlayingSlot.translations].t(
        "ASE.Web.IPod.NowPlaying.PlaybackProgress",
      ),
      valuetext: formatDuration(
        context[NowPlayingSlot.roundedTime],
        context[NowPlayingSlot.translations],
      ),
      testId: "now-playing-scrub",
    },
  });
  scrubControl.$on("focus", context[NowPlayingSlot.scrubFocus]);
  scrubControl.$on("input", context[NowPlayingSlot.scrub]);
  scrubControl.$on("change", context[NowPlayingSlot.scrubCommit]);
  scrubControl.$on("blur", context[NowPlayingSlot.scrubBlur]);
  volumeLowIcon = new VolumeLowIcon({
    props: {
      class: "volume-icon-low",
      "aria-hidden": "true",
    },
  });
  volumeControl = new ProgressBar({
    props: {
      value: context[NowPlayingSlot.volume],
      max: 100,
      label: context[NowPlayingSlot.translations].t(
        "ASE.Web.IPod.NowPlaying.Volume",
      ),
      valuetext: context[NowPlayingSlot.translations].formatNumber(
        context[NowPlayingSlot.volume] / 100,
        {
          style: "percent",
        },
      ),
      testId: "now-playing-volume",
    },
  });
  volumeControl.$on("focus", context[NowPlayingSlot.volumeFocus]);
  volumeControl.$on("input", context[NowPlayingSlot.volumeValue]);
  volumeControl.$on("blur", context[NowPlayingSlot.volumeBlur]);
  volumeHighIcon = new VolumeHighIcon({
    props: {
      class: "volume-icon-high",
      "aria-hidden": "true",
    },
  });
  return {
    create() {
      nowPlaying = element("div");
      nowPlayingIndex = element("div");
      span = element("span");
      positionText = text(context[NowPlayingSlot.position]);
      if (playModes) {
        playModes.create();
      }
      anchor = empty();
      if (playModeLabel) {
        playModeLabel.create();
      }
      spacer = space();
      nowPlayingInfo = element("div");
      if (songTitle) {
        songTitle.create();
      }
      spacer2 = space();
      if (artist) {
        artist.create();
      }
      spacer3 = space();
      if (album) {
        album.create();
      }
      spacer4 = space();
      nowPlayingProgress = element("div");
      timeAndProgress = element("div");
      createFragment(playbackProgress.$$.fragment);
      spacer5 = space();
      progressLabels = element("div");
      span2 = element("span");
      elapsedTimeText = text(context[NowPlayingSlot.elapsedTime]);
      spacer6 = space();
      span3 = element("span");
      remainingTimeText = text(context[NowPlayingSlot.remainingTime]);
      spacer7 = space();
      scrubbingIndicator = element("div");
      createFragment(scrubControl.$$.fragment);
      spacer8 = space();
      progressLabels2 = element("div");
      span4 = element("span");
      elapsedTimeText2 = text(context[NowPlayingSlot.elapsedTime]);
      spacer9 = space();
      span5 = element("span");
      remainingTimeText2 = text(context[NowPlayingSlot.remainingTime]);
      spacer10 = space();
      volumeLabels = element("div");
      createFragment(volumeLowIcon.$$.fragment);
      spacer11 = space();
      createFragment(volumeControl.$$.fragment);
      spacer12 = space();
      createFragment(volumeHighIcon.$$.fragment);
      attr(nowPlayingIndex, "class", "now-playing-index svelte-w35jhk");
      attr(nowPlayingIndex, "data-testid", "now-playing-index");
      attr(nowPlayingInfo, "class", "now-playing-info svelte-w35jhk");
      attr(span2, "data-testid", "now-playing-elapsed");
      attr(span3, "data-testid", "now-playing-remaining");
      attr(progressLabels, "class", "progress-labels svelte-w35jhk");
      attr(timeAndProgress, "class", "time-and-progress svelte-w35jhk");
      attr(timeAndProgress, "aria-hidden", "true");
      attr(span4, "data-testid", "now-playing-scrub-elapsed");
      attr(span5, "data-testid", "now-playing-scrub-remaining");
      attr(progressLabels2, "class", "progress-labels svelte-w35jhk");
      attr(progressLabels2, "aria-hidden", "true");
      attr(scrubbingIndicator, "class", "scrubbing-indicator svelte-w35jhk");
      attr(scrubbingIndicator, "data-testid", "now-playing-scrubber");
      toggleClass(
        scrubbingIndicator,
        "inactive",
        context[NowPlayingSlot.previousMode] !== "scrubbing",
      );
      attr(volumeLabels, "class", "volume-labels svelte-w35jhk");
      attr(volumeLabels, "data-testid", "now-playing-volume-labels");
      toggleClass(
        volumeLabels,
        "inactive",
        context[NowPlayingSlot.previousMode] !== "volume",
      );
      attr(nowPlayingProgress, "class", "now-playing-progress svelte-w35jhk");
      attr(nowPlayingProgress, "data-testid", "now-playing-progress");
      attr(nowPlayingProgress, "data-mode", context[NowPlayingSlot.mode]);
      attr(nowPlaying, "class", "now-playing svelte-w35jhk");
      attr(nowPlaying, "data-testid", "now-playing");
      attr(nowPlaying, "role", "group");
      attr(nowPlaying, "aria-labelledby", "menu-title");
      attr(nowPlaying, "tabindex", "0");
    },
    mount(target: DomParent, anchor2: Node | null) {
      insert(target, nowPlaying, anchor2);
      append(nowPlaying, nowPlayingIndex);
      append(nowPlayingIndex, span);
      append(span, positionText);
      if (playModes) {
        playModes.mount(nowPlayingIndex, null);
      }
      append(nowPlayingIndex, anchor);
      if (playModeLabel) {
        playModeLabel.mount(nowPlayingIndex, null);
      }
      append(nowPlaying, spacer);
      append(nowPlaying, nowPlayingInfo);
      if (songTitle) {
        songTitle.mount(nowPlayingInfo, null);
      }
      append(nowPlayingInfo, spacer2);
      if (artist) {
        artist.mount(nowPlayingInfo, null);
      }
      append(nowPlayingInfo, spacer3);
      if (album) {
        album.mount(nowPlayingInfo, null);
      }
      append(nowPlaying, spacer4);
      append(nowPlaying, nowPlayingProgress);
      append(nowPlayingProgress, timeAndProgress);
      mountComponent(playbackProgress, timeAndProgress, null);
      append(timeAndProgress, spacer5);
      append(timeAndProgress, progressLabels);
      append(progressLabels, span2);
      append(span2, elapsedTimeText);
      append(progressLabels, spacer6);
      append(progressLabels, span3);
      append(span3, remainingTimeText);
      append(nowPlayingProgress, spacer7);
      append(nowPlayingProgress, scrubbingIndicator);
      mountComponent(scrubControl, scrubbingIndicator, null);
      append(scrubbingIndicator, spacer8);
      append(scrubbingIndicator, progressLabels2);
      append(progressLabels2, span4);
      append(span4, elapsedTimeText2);
      append(progressLabels2, spacer9);
      append(progressLabels2, span5);
      append(span5, remainingTimeText2);
      append(nowPlayingProgress, spacer10);
      append(nowPlayingProgress, volumeLabels);
      mountComponent(volumeLowIcon, volumeLabels, null);
      append(volumeLabels, spacer11);
      mountComponent(volumeControl, volumeLabels, null);
      append(volumeLabels, spacer12);
      mountComponent(volumeHighIcon, volumeLabels, null);
      current = true;
      if (!focused) {
        focusWhenRequested.call(
          null,
          nowPlaying,
          context[NowPlayingSlot.shouldFocus],
        );
        focused = true;
      }
    },
    update(nextContext: Context, dirty: number[]) {
      if (!current || dirty[0] & (1 << NowPlayingSlot.position)) {
        setData(positionText, nextContext[NowPlayingSlot.position]);
      }
      if (
        nextContext[NowPlayingSlot.shuffleMode] ||
        nextContext[NowPlayingSlot.repeatMode] !== "none"
      ) {
        if (playModes) {
          playModes.update(nextContext, dirty);
          if (
            dirty[0] &
            ((1 << NowPlayingSlot.shuffleMode) |
              (1 << NowPlayingSlot.repeatMode))
          ) {
            transitionIn(playModes, 1);
          }
        } else {
          playModes = renderPlayModes(nextContext);
          playModes.create();
          transitionIn(playModes, 1);
          playModes.mount(nowPlayingIndex, anchor);
        }
      } else if (playModes) {
        groupOutros();
        transitionOut(playModes, 1, 1, () => {
          playModes = null;
        });
        checkOutros();
      }
      if (nextContext[NowPlayingSlot.playModesLabel]) {
        if (playModeLabel) {
          playModeLabel.update(nextContext, dirty);
        } else {
          playModeLabel = renderPlayModeLabel(nextContext);
          playModeLabel.create();
          playModeLabel.mount(nowPlayingIndex, null);
        }
      } else if (playModeLabel) {
        playModeLabel.destroy(1);
        playModeLabel = null;
      }
      if (nextContext[NowPlayingSlot.title]) {
        if (songTitle) {
          songTitle.update(nextContext, dirty);
          if (dirty[0] & (1 << NowPlayingSlot.title)) {
            transitionIn(songTitle, 1);
          }
        } else {
          songTitle = renderSongTitle(nextContext);
          songTitle.create();
          transitionIn(songTitle, 1);
          songTitle.mount(nowPlayingInfo, spacer2);
        }
      } else if (songTitle) {
        groupOutros();
        transitionOut(songTitle, 1, 1, () => {
          songTitle = null;
        });
        checkOutros();
      }
      if (nextContext[NowPlayingSlot.artistName]) {
        if (artist) {
          artist.update(nextContext, dirty);
        } else {
          artist = renderArtist(nextContext);
          artist.create();
          artist.mount(nowPlayingInfo, spacer3);
        }
      } else if (artist) {
        artist.destroy(1);
        artist = null;
      }
      if (nextContext[NowPlayingSlot.albumName]) {
        if (album) {
          album.update(nextContext, dirty);
        } else {
          album = renderAlbum(nextContext);
          album.create();
          album.mount(nowPlayingInfo, null);
        }
      } else if (album) {
        album.destroy(1);
        album = null;
      }
      const attributes: Partial<ProgressProps> = {};
      if (dirty[0] & (1 << NowPlayingSlot.displayTime)) {
        attributes.value = nextContext[NowPlayingSlot.displayTime];
      }
      if (dirty[0] & (1 << NowPlayingSlot.duration)) {
        attributes.max = nextContext[NowPlayingSlot.duration];
      }
      playbackProgress.$set(attributes);
      if (!current || dirty[0] & (1 << NowPlayingSlot.elapsedTime)) {
        setData(elapsedTimeText, nextContext[NowPlayingSlot.elapsedTime]);
      }
      if (!current || dirty[0] & (1 << NowPlayingSlot.remainingTime)) {
        setData(remainingTimeText, nextContext[NowPlayingSlot.remainingTime]);
      }
      const value8: Partial<ProgressProps> = {};
      if (dirty[0] & (1 << NowPlayingSlot.roundedTime)) {
        value8.value = nextContext[NowPlayingSlot.roundedTime];
      }
      if (dirty[0] & (1 << NowPlayingSlot.duration)) {
        value8.max = nextContext[NowPlayingSlot.duration];
      }
      if (dirty[0] & (1 << NowPlayingSlot.isPositionDisabled)) {
        value8.disabled = nextContext[NowPlayingSlot.isPositionDisabled];
      }
      if (dirty[0] & (1 << NowPlayingSlot.translations)) {
        value8.label = nextContext[NowPlayingSlot.translations].t(
          "ASE.Web.IPod.NowPlaying.PlaybackProgress",
        );
      }
      if (
        dirty[0] &
        ((1 << NowPlayingSlot.translations) | (1 << NowPlayingSlot.roundedTime))
      ) {
        value8.valuetext = formatDuration(
          nextContext[NowPlayingSlot.roundedTime],
          nextContext[NowPlayingSlot.translations],
        );
      }
      scrubControl.$set(value8);
      if (!current || dirty[0] & (1 << NowPlayingSlot.elapsedTime)) {
        setData(elapsedTimeText2, nextContext[NowPlayingSlot.elapsedTime]);
      }
      if (!current || dirty[0] & (1 << NowPlayingSlot.remainingTime)) {
        setData(remainingTimeText2, nextContext[NowPlayingSlot.remainingTime]);
      }
      if (!current || dirty[0] & (1 << NowPlayingSlot.previousMode)) {
        toggleClass(
          scrubbingIndicator,
          "inactive",
          nextContext[NowPlayingSlot.previousMode] !== "scrubbing",
        );
      }
      const value9: Partial<ProgressProps> = {};
      if (dirty[0] & (1 << NowPlayingSlot.volume)) {
        value9.value = nextContext[NowPlayingSlot.volume];
      }
      if (dirty[0] & (1 << NowPlayingSlot.translations)) {
        value9.label = nextContext[NowPlayingSlot.translations].t(
          "ASE.Web.IPod.NowPlaying.Volume",
        );
      }
      if (
        dirty[0] &
        ((1 << NowPlayingSlot.volume) | (1 << NowPlayingSlot.translations))
      ) {
        value9.valuetext = nextContext[
          NowPlayingSlot.translations
        ].formatNumber(nextContext[NowPlayingSlot.volume] / 100, {
          style: "percent",
        });
      }
      volumeControl.$set(value9);
      if (!current || dirty[0] & (1 << NowPlayingSlot.previousMode)) {
        toggleClass(
          volumeLabels,
          "inactive",
          nextContext[NowPlayingSlot.previousMode] !== "volume",
        );
      }
      if (!current || dirty[0] & (1 << NowPlayingSlot.mode)) {
        attr(nowPlayingProgress, "data-mode", nextContext[NowPlayingSlot.mode]);
      }
    },
    intro(local?: TransitionFlag) {
      if (!current) {
        transitionIn(playModes);
        transitionIn(songTitle);
        transitionIn(playbackProgress.$$.fragment, local);
        transitionIn(scrubControl.$$.fragment, local);
        transitionIn(volumeLowIcon.$$.fragment, local);
        transitionIn(volumeControl.$$.fragment, local);
        transitionIn(volumeHighIcon.$$.fragment, local);
        current = true;
      }
    },
    outro(local?: TransitionFlag) {
      transitionOut(playModes);
      transitionOut(songTitle);
      transitionOut(playbackProgress.$$.fragment, local);
      transitionOut(scrubControl.$$.fragment, local);
      transitionOut(volumeLowIcon.$$.fragment, local);
      transitionOut(volumeControl.$$.fragment, local);
      transitionOut(volumeHighIcon.$$.fragment, local);
      current = false;
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(nowPlaying);
      }
      if (playModes) {
        playModes.destroy();
      }
      if (playModeLabel) {
        playModeLabel.destroy();
      }
      if (songTitle) {
        songTitle.destroy();
      }
      if (artist) {
        artist.destroy();
      }
      if (album) {
        album.destroy();
      }
      destroyComponent(playbackProgress);
      destroyComponent(scrubControl);
      destroyComponent(volumeLowIcon);
      destroyComponent(volumeControl);
      destroyComponent(volumeHighIcon);
      focused = false;
    },
  };
}
function nowPlayingInstance(
  component: Component<unknown[], NowPlayingProps>,
  props: NowPlayingProps,
  invalidate: Invalidate,
) {
  let displayTime!: number,
    elapsedTime!: string,
    remainingTime!: string,
    position!: string,
    playModesKey!: string | undefined,
    playModesLabel!: string,
    roundedTime!: number,
    translations!: Model.I18n,
    { songIndex: songIndex } = props,
    { songCount } = props,
    { songId = void 0 } = props,
    { title = void 0 } = props,
    { titleUrl = void 0 } = props,
    { navigateToUrl = void 0 } = props,
    { artistName = void 0 } = props,
    { albumName = void 0 } = props,
    { currentTime = 0 } = props,
    { duration = 0 } = props,
    { isSeeking = false } = props,
    { seekPreviewTime = void 0 } = props,
    { isAdjustingVolume = false } = props,
    { volume = 50 } = props,
    { isPositionDisabled = false } = props,
    { shuffleMode = false } = props,
    { repeatMode = "none" } = props,
    { shouldFocus = false } = props;
  const i18n = useI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(NowPlayingSlot.translations, (translations = value)),
  );
  const playModeLabels: Record<string, string | undefined> = {
    "shuffle-none": "ASE.Web.IPod.NowPlaying.ShuffleOn",
    "shuffle-one": "ASE.Web.IPod.NowPlaying.ShuffleOnRepeatOne",
    "shuffle-all": "ASE.Web.IPod.NowPlaying.ShuffleOnRepeatAll",
    "ordered-one": "ASE.Web.IPod.NowPlaying.RepeatOne",
    "ordered-all": "ASE.Web.IPod.NowPlaying.RepeatAll",
  };
  let mode = "progress",
    previousMode = "volume";
  const dispatch = createEventDispatcher(),
    scrubFocus = () => dispatch("scrubfocus"),
    scrub = (value: CustomEvent<number>) => dispatch("scrub", value.detail),
    scrubCommit = () => dispatch("scrubcommit"),
    scrubBlur = () => dispatch("scrubblur"),
    volumeFocus = () => dispatch("volumefocus"),
    volumeValue = (value: CustomEvent<number>) =>
      dispatch("volume", value.detail),
    volumeBlur = () => dispatch("volumeblur");
  component.$$set = (value) => {
    if ("songIndex" in value) {
      invalidate(NowPlayingSlot.songIndex, (songIndex = value.songIndex!));
    }
    if ("songCount" in value) {
      invalidate(NowPlayingSlot.songCount, (songCount = value.songCount!));
    }
    if ("songId" in value) {
      invalidate(NowPlayingSlot.songId, (songId = value.songId!));
    }
    if ("title" in value) {
      invalidate(NowPlayingSlot.title, (title = value.title!));
    }
    if ("titleUrl" in value) {
      invalidate(NowPlayingSlot.titleUrl, (titleUrl = value.titleUrl!));
    }
    if ("navigateToUrl" in value) {
      invalidate(
        NowPlayingSlot.navigateToUrl,
        (navigateToUrl = value.navigateToUrl!),
      );
    }
    if ("artistName" in value) {
      invalidate(NowPlayingSlot.artistName, (artistName = value.artistName!));
    }
    if ("albumName" in value) {
      invalidate(NowPlayingSlot.albumName, (albumName = value.albumName!));
    }
    if ("currentTime" in value) {
      invalidate(
        NowPlayingSlot.currentTime,
        (currentTime = value.currentTime!),
      );
    }
    if ("duration" in value) {
      invalidate(NowPlayingSlot.duration, (duration = value.duration!));
    }
    if ("isSeeking" in value) {
      invalidate(NowPlayingSlot.isSeeking, (isSeeking = value.isSeeking!));
    }
    if ("seekPreviewTime" in value) {
      invalidate(
        NowPlayingSlot.seekPreviewTime,
        (seekPreviewTime = value.seekPreviewTime!),
      );
    }
    if ("isAdjustingVolume" in value) {
      invalidate(
        NowPlayingSlot.isAdjustingVolume,
        (isAdjustingVolume = value.isAdjustingVolume!),
      );
    }
    if ("volume" in value) {
      invalidate(NowPlayingSlot.volume, (volume = value.volume!));
    }
    if ("isPositionDisabled" in value) {
      invalidate(
        NowPlayingSlot.isPositionDisabled,
        (isPositionDisabled = value.isPositionDisabled!),
      );
    }
    if ("shuffleMode" in value) {
      invalidate(
        NowPlayingSlot.shuffleMode,
        (shuffleMode = value.shuffleMode!),
      );
    }
    if ("repeatMode" in value) {
      invalidate(NowPlayingSlot.repeatMode, (repeatMode = value.repeatMode!));
    }
    if ("shouldFocus" in value) {
      invalidate(
        NowPlayingSlot.shouldFocus,
        (shouldFocus = value.shouldFocus!),
      );
    }
  };
  component.$$.update = () => {
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.currentTime) |
        (1 << NowPlayingSlot.isSeeking) |
        (1 << NowPlayingSlot.seekPreviewTime))
    ) {
      invalidate(
        NowPlayingSlot.displayTime,
        (displayTime =
          isSeeking && seekPreviewTime !== void 0
            ? seekPreviewTime
            : currentTime),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.duration) |
        (1 << NowPlayingSlot.displayTime) |
        (1 << NowPlayingSlot.translations))
    ) {
      invalidate(
        NowPlayingSlot.elapsedTime,
        (elapsedTime =
          duration > 0 ? formatTime(displayTime, translations) : ""),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.duration) |
        (1 << NowPlayingSlot.displayTime) |
        (1 << NowPlayingSlot.translations))
    ) {
      invalidate(
        NowPlayingSlot.remainingTime,
        (remainingTime = formatRemainingTime(
          displayTime,
          duration,
          translations,
        )),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.translations) |
        (1 << NowPlayingSlot.songIndex) |
        (1 << NowPlayingSlot.songCount))
    ) {
      invalidate(
        NowPlayingSlot.position,
        (position = translations.t("ASE.Web.IPod.NowPlaying.Position", {
          index: translations.formatNumber(songIndex),
          total: translations.formatNumber(songCount),
        })),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.shuffleMode) | (1 << NowPlayingSlot.repeatMode))
    ) {
      invalidate(
        NowPlayingSlot.playModesKey,
        (playModesKey =
          playModeLabels[
            `${shuffleMode ? "shuffle" : "ordered"}-${repeatMode}`
          ]),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.translations) | (1 << NowPlayingSlot.playModesKey))
    ) {
      invalidate(
        NowPlayingSlot.playModesLabel,
        (playModesLabel = playModesKey ? translations.t(playModesKey) : ""),
      );
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.isSeeking) |
        (1 << NowPlayingSlot.isAdjustingVolume))
    ) {
      if (isAdjustingVolume) {
        invalidate(NowPlayingSlot.mode, (mode = "volume"));
      } else if (isSeeking) {
        invalidate(NowPlayingSlot.mode, (mode = "scrubbing"));
      } else {
        invalidate(NowPlayingSlot.mode, (mode = "progress"));
      }
    }
    if (
      component.$$.dirty[0] & (1 << NowPlayingSlot.mode) &&
      mode !== "progress"
    ) {
      invalidate(NowPlayingSlot.previousMode, (previousMode = mode));
    }
    if (
      component.$$.dirty[0] &
      ((1 << NowPlayingSlot.duration) | (1 << NowPlayingSlot.displayTime))
    ) {
      invalidate(
        NowPlayingSlot.roundedTime,
        (roundedTime = duration > 0 ? Math.floor(displayTime) : 0),
      );
    }
  };
  return [
    songId,
    title,
    titleUrl,
    navigateToUrl,
    artistName,
    albumName,
    duration,
    volume,
    isPositionDisabled,
    shuffleMode,
    repeatMode,
    shouldFocus,
    mode,
    displayTime,
    translations,
    previousMode,
    roundedTime,
    playModesLabel,
    position,
    remainingTime,
    elapsedTime,
    i18n,
    dispatch,
    songIndex,
    songCount,
    currentTime,
    isSeeking,
    seekPreviewTime,
    isAdjustingVolume,
    playModesKey,
    scrubFocus,
    scrub,
    scrubCommit,
    scrubBlur,
    volumeFocus,
    volumeValue,
    volumeBlur,
  ] satisfies [unknown, ...unknown[]];
}
class NowPlaying extends SvelteComponent<Context, NowPlayingProps> {
  constructor(options: ComponentOptions<NowPlayingProps>) {
    super();
    initComponent(
      this,
      options,
      nowPlayingInstance,
      renderNowPlaying,
      safeNotEqual,
      {
        songIndex: NowPlayingSlot.songIndex,
        songCount: NowPlayingSlot.songCount,
        songId: NowPlayingSlot.songId,
        title: NowPlayingSlot.title,
        titleUrl: NowPlayingSlot.titleUrl,
        navigateToUrl: NowPlayingSlot.navigateToUrl,
        artistName: NowPlayingSlot.artistName,
        albumName: NowPlayingSlot.albumName,
        currentTime: NowPlayingSlot.currentTime,
        duration: NowPlayingSlot.duration,
        isSeeking: NowPlayingSlot.isSeeking,
        seekPreviewTime: NowPlayingSlot.seekPreviewTime,
        isAdjustingVolume: NowPlayingSlot.isAdjustingVolume,
        volume: NowPlayingSlot.volume,
        isPositionDisabled: NowPlayingSlot.isPositionDisabled,
        shuffleMode: NowPlayingSlot.shuffleMode,
        repeatMode: NowPlayingSlot.repeatMode,
        shouldFocus: NowPlayingSlot.shouldFocus,
      },
      nowPlayingStyles,
      [-1, -1],
    );
  }
  get songIndex() {
    return this.$$.ctx[NowPlayingSlot.songIndex]!;
  }
  set songIndex(index: NowPlayingProps["songIndex"]) {
    this.$$set!({
      songIndex: index,
    });
    flush();
  }
  get songCount() {
    return this.$$.ctx[NowPlayingSlot.songCount]!;
  }
  set songCount(songCount: NowPlayingProps["songCount"]) {
    this.$$set!({
      songCount,
    });
    flush();
  }
  get songId() {
    return this.$$.ctx[NowPlayingSlot.songId]!;
  }
  set songId(songId: NowPlayingProps["songId"]) {
    this.$$set!({
      songId,
    });
    flush();
  }
  get title() {
    return this.$$.ctx[NowPlayingSlot.title]!;
  }
  set title(title: NowPlayingProps["title"]) {
    this.$$set!({
      title,
    });
    flush();
  }
  get titleUrl() {
    return this.$$.ctx[NowPlayingSlot.titleUrl]!;
  }
  set titleUrl(titleUrl: NowPlayingProps["titleUrl"]) {
    this.$$set!({
      titleUrl,
    });
    flush();
  }
  get navigateToUrl() {
    return this.$$.ctx[NowPlayingSlot.navigateToUrl]!;
  }
  set navigateToUrl(navigateToUrl: NowPlayingProps["navigateToUrl"]) {
    this.$$set!({
      navigateToUrl,
    });
    flush();
  }
  get artistName() {
    return this.$$.ctx[NowPlayingSlot.artistName]!;
  }
  set artistName(artistName: NowPlayingProps["artistName"]) {
    this.$$set!({
      artistName,
    });
    flush();
  }
  get albumName() {
    return this.$$.ctx[NowPlayingSlot.albumName]!;
  }
  set albumName(albumName: NowPlayingProps["albumName"]) {
    this.$$set!({
      albumName,
    });
    flush();
  }
  get currentTime() {
    return this.$$.ctx[NowPlayingSlot.currentTime]!;
  }
  set currentTime(currentTime: NowPlayingProps["currentTime"]) {
    this.$$set!({
      currentTime,
    });
    flush();
  }
  get duration() {
    return this.$$.ctx[NowPlayingSlot.duration]!;
  }
  set duration(duration: NowPlayingProps["duration"]) {
    this.$$set!({
      duration,
    });
    flush();
  }
  get isSeeking() {
    return this.$$.ctx[NowPlayingSlot.isSeeking]!;
  }
  set isSeeking(isSeeking: NowPlayingProps["isSeeking"]) {
    this.$$set!({
      isSeeking,
    });
    flush();
  }
  get seekPreviewTime() {
    return this.$$.ctx[NowPlayingSlot.seekPreviewTime]!;
  }
  set seekPreviewTime(seekPreviewTime: NowPlayingProps["seekPreviewTime"]) {
    this.$$set!({
      seekPreviewTime,
    });
    flush();
  }
  get isAdjustingVolume() {
    return this.$$.ctx[NowPlayingSlot.isAdjustingVolume]!;
  }
  set isAdjustingVolume(
    isAdjustingVolume: NowPlayingProps["isAdjustingVolume"],
  ) {
    this.$$set!({
      isAdjustingVolume,
    });
    flush();
  }
  get volume() {
    return this.$$.ctx[NowPlayingSlot.volume]!;
  }
  set volume(volume: NowPlayingProps["volume"]) {
    this.$$set!({
      volume,
    });
    flush();
  }
  get isPositionDisabled() {
    return this.$$.ctx[NowPlayingSlot.isPositionDisabled]!;
  }
  set isPositionDisabled(
    isPositionDisabled: NowPlayingProps["isPositionDisabled"],
  ) {
    this.$$set!({
      isPositionDisabled,
    });
    flush();
  }
  get shuffleMode() {
    return this.$$.ctx[NowPlayingSlot.shuffleMode]!;
  }
  set shuffleMode(shuffleMode: NowPlayingProps["shuffleMode"]) {
    this.$$set!({
      shuffleMode,
    });
    flush();
  }
  get repeatMode() {
    return this.$$.ctx[NowPlayingSlot.repeatMode]!;
  }
  set repeatMode(repeatMode: NowPlayingProps["repeatMode"]) {
    this.$$set!({
      repeatMode,
    });
    flush();
  }
  get shouldFocus() {
    return this.$$.ctx[NowPlayingSlot.shouldFocus]!;
  }
  set shouldFocus(shouldFocus: NowPlayingProps["shouldFocus"]) {
    this.$$set!({
      shouldFocus,
    });
    flush();
  }
}
createSvelteCustomElement(
  NowPlaying,
  {
    songIndex: {},
    songCount: {},
    songId: {},
    title: {},
    titleUrl: {},
    navigateToUrl: {},
    artistName: {},
    albumName: {},
    currentTime: {},
    duration: {},
    isSeeking: {
      type: "Boolean",
    },
    seekPreviewTime: {},
    isAdjustingVolume: {
      type: "Boolean",
    },
    volume: {},
    isPositionDisabled: {
      type: "Boolean",
    },
    shuffleMode: {
      type: "Boolean",
    },
    repeatMode: {},
    shouldFocus: {
      type: "Boolean",
    },
  },
  [],
  [],
  true,
);
export { NowPlaying };
