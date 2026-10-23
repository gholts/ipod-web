export {};

declare global {
  interface Window {
    __svelte?: { v: Set<string> };
    webkitAudioContext?: typeof AudioContext;
  }
}
