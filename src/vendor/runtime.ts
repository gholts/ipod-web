import type * as Runtime from "./runtime-types.js";
import type { Readable, Writable, Unsubscribe } from "../types.js";
type StartStopNotifier<T> = (
  set: (value: T) => void,
  update: (fn: (value: T) => T) => void,
) => void | Unsubscribe;
// Svelte 4 DOM/lifecycle runtime retained for the original compiled views.
// Preserve original initialization barrier: catalogs load before device state.
import "../data.js";
var defineProperty = Object.defineProperty;
var defineOwnProperty = <T extends object>(
  object: T,
  key: PropertyKey,
  value?: unknown,
) =>
  key in object
    ? defineProperty(object, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : ((object as Record<PropertyKey, unknown>)[key] = value);
var defineField = <T extends object>(
  object: T,
  key: PropertyKey,
  value?: unknown,
) => defineOwnProperty(object, typeof key != "symbol" ? key + "" : key, value);
function noop() {}
const identity = <T>(value: T): T => value;
function assign<T extends object, S extends object>(
  target: T,
  source: S,
): T & S {
  for (const key in source)
    (target as Record<string, unknown>)[key] = source[key];
  return target as T & S;
}
function run(callback: () => unknown) {
  return callback();
}
function blankObject<T>(): Record<string, T> {
  return /* @__PURE__ */ Object.create(null) as Record<string, T>;
}
function runAll(callbacks: (() => unknown)[]) {
  callbacks.forEach(run);
}
function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value == "function";
}
function safeNotEqual(previous: unknown, next: unknown) {
  return previous != previous
    ? next == next
    : previous !== next ||
        (previous && typeof previous == "object") ||
        typeof previous == "function";
}
function isEmpty(object: object) {
  return Object.keys(object).length === 0;
}
function subscribe<T>(
  store: Runtime.Observable<T> | null | undefined,
  ...callbacks: [run: (value: T) => void, invalidate?: (value?: T) => void]
): Unsubscribe {
  if (store == null) {
    for (const callback of callbacks) callback!(void 0 as T);
    return noop;
  }
  const unsubscribe = store.subscribe(...callbacks);
  return unsubscribe.unsubscribe
    ? () => unsubscribe.unsubscribe!()
    : (unsubscribe as Unsubscribe);
}
function getStore<T>(store: Readable<T>): T {
  let value!: T;
  subscribe(store, (next: T) => (value = next))();
  return value;
}
function subscribeComponent<C extends Runtime.Context, P extends object, T>(
  component: Runtime.Component<C, P>,
  store: Runtime.Observable<T>,
  callback: (value: T) => void,
) {
  component.$$.on_destroy!.push(subscribe(store, callback));
}
function publicProps<P extends object>(props: P): Partial<P> {
  const result: Partial<P> = {};
  for (const key in props)
    if (key[0] !== "$") {
      result[key] = props[key];
    }
  return result;
}
function actionDestroyer(
  action: Runtime.Action | null | undefined | void,
): () => void {
  return action && isFunction(action.destroy) ? action.destroy : noop;
}
const isBrowser = typeof window < "u";
let now = isBrowser ? () => window.performance.now() : () => Date.now(),
  requestFrame: (callback: FrameRequestCallback) => number | void = isBrowser
    ? (callback: FrameRequestCallback) => requestAnimationFrame(callback)
    : noop;
const frameTasks: Set<Runtime.LoopTask> = /* @__PURE__ */ new Set();
function runTasks(time: number) {
  frameTasks.forEach((task: Runtime.LoopTask) => {
    if (!task.callback(time)) {
      frameTasks.delete(task);
      task.finish();
    }
  });
  if (frameTasks.size !== 0) {
    requestFrame(runTasks);
  }
}
function loop(callback: (time: number) => boolean): Runtime.Loop {
  let task: Runtime.LoopTask;
  if (frameTasks.size === 0) {
    requestFrame(runTasks);
  }
  return {
    promise: new Promise<void>((finish: () => void) => {
      frameTasks.add(
        (task = {
          callback,
          finish,
        }),
      );
    }),
    abort() {
      frameTasks.delete(task);
    },
  };
}
const globals =
  typeof window < "u" ? window : typeof globalThis < "u" ? globalThis : global;
let hydrating = false;
function startHydrating() {
  hydrating = true;
}
function endHydrating() {
  hydrating = false;
}
function upperBound(
  low: number,
  high: number,
  valueAt: (index: number) => number,
  value: number,
) {
  for (; low < high;) {
    const middle = low + ((high - low) >> 1);
    if (valueAt(middle) <= value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}
function initHydrate(target: Runtime.HydrationParent) {
  if (target.hydrate_init) return;
  target.hydrate_init = true;
  let nodes: ArrayLike<Runtime.HydrationNode> = target.childNodes;
  if (target.nodeName === "HEAD") {
    const index = [];
    for (let position = 0; position < nodes.length; position++) {
      const previousLength = nodes[position];
      if (previousLength.claim_order !== void 0) {
        index.push(previousLength);
      }
    }
    nodes = index;
  }
  const ends = new Int32Array(nodes.length + 1),
    predecessors = new Int32Array(nodes.length);
  ends[0] = -1;
  let longestLength = 0;
  for (let index = 0; index < nodes.length; index++) {
    const position = nodes[index].claim_order,
      previousLength =
        (longestLength > 0 &&
        nodes[ends[longestLength]].claim_order! <= position!
          ? longestLength + 1
          : upperBound(
              1,
              longestLength,
              (A: number) => nodes[ends[A]].claim_order!,
              position!,
            )) - 1;
    predecessors[index] = ends[previousLength] + 1;
    const nextLength = previousLength + 1;
    ends[nextLength] = index;
    longestLength = Math.max(nextLength, longestLength);
  }
  const stable = [],
    moving = [];
  let scanIndex = nodes.length - 1;
  for (
    let index = ends[longestLength] + 1;
    index != 0;
    index = predecessors[index - 1]
  ) {
    for (stable.push(nodes[index - 1]); scanIndex >= index; scanIndex--)
      moving.push(nodes[scanIndex]);
    scanIndex--;
  }
  for (; scanIndex >= 0; scanIndex--) moving.push(nodes[scanIndex]);
  stable.reverse();
  moving.sort(
    (index: Runtime.HydrationNode, position: Runtime.HydrationNode) =>
      index.claim_order! - position.claim_order!,
  );
  for (let index = 0, position = 0; index < moving.length; index++) {
    for (
      ;
      position < stable.length &&
      moving[index].claim_order! >= stable[position].claim_order!;
    )
      position++;
    const previousLength = position < stable.length ? stable[position] : null;
    target.insertBefore(moving[index], previousLength);
  }
}
function append(target: Runtime.DomParent, node: Node) {
  target.appendChild(node);
}
function appendStyles(target: Node | undefined, id: string, css: string) {
  const root = styleRoot(target);
  if (!root.getElementById(id)) {
    const style = element("style");
    style.id = id;
    style.textContent = css;
    appendStylesheet(root, style);
  }
}
function styleRoot(node?: Node): Document | ShadowRoot {
  if (!node) return document;
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  return root && (root as ShadowRoot).host
    ? (root as ShadowRoot)
    : node.ownerDocument!;
}
function appendEmptyStylesheet(node: Node): CSSStyleSheet {
  const style = element("style");
  style.textContent = "/* empty */";
  appendStylesheet(styleRoot(node), style);
  return style.sheet!;
}
function appendStylesheet(
  root: Document | ShadowRoot,
  style: HTMLStyleElement,
): CSSStyleSheet {
  append((root as Document).head || root, style);
  return style.sheet!;
}
function appendHydrated(
  target: Runtime.HydrationParent,
  node: Runtime.HydrationNode,
) {
  if (hydrating) {
    for (
      initHydrate(target),
        (target.actual_end_child === void 0 ||
          (target.actual_end_child !== null &&
            target.actual_end_child.parentNode !== target)) &&
          (target.actual_end_child = target.firstChild);
      target.actual_end_child !== null &&
      target.actual_end_child.claim_order === void 0;
    )
      target.actual_end_child = target.actual_end_child.nextSibling;
    if (node !== target.actual_end_child) {
      if (node.claim_order !== void 0 || node.parentNode !== target) {
        target.insertBefore(node, target.actual_end_child);
      }
    } else {
      target.actual_end_child = node.nextSibling;
    }
  } else if (node.parentNode !== target || node.nextSibling !== null) {
    target.appendChild(node);
  }
}
function insert(target: Runtime.DomParent, node: Node, anchor?: Node | null) {
  target.insertBefore(node, anchor || null);
}
function insertHydration(
  target: Runtime.HydrationParent,
  node: Runtime.HydrationNode,
  anchor?: Node | null,
) {
  if (hydrating && !anchor) {
    appendHydrated(target, node);
  } else {
    if (node.parentNode !== target || node.nextSibling != anchor) {
      target.insertBefore(node, anchor || null);
    }
  }
}
function detach(node: Node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function destroyEach(
  fragments: (Runtime.FragmentLifecycle | undefined)[],
  detaching?: Runtime.TransitionFlag,
) {
  for (let index = 0; index < fragments.length; index += 1)
    if (fragments[index]) {
      fragments[index]!.destroy(detaching);
    }
}
function element<K extends keyof HTMLElementTagNameMap>(
  name: K,
): HTMLElementTagNameMap[K] {
  return document.createElement(name);
}
function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text(value: unknown) {
  return document.createTextNode(value as string);
}
function space() {
  return text(" ");
}
function empty() {
  return text("");
}
function listen<E extends Event>(
  target: EventTarget,
  type: string,
  listener: ((event: E) => void) | EventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(
    type,
    listener as EventListenerOrEventListenerObject,
    options,
  );
  return () =>
    target.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    );
}
function attr(node: Element, name: string, value: unknown) {
  if (value == null) {
    node.removeAttribute(name);
  } else {
    if (node.getAttribute(name) !== value) {
      node.setAttribute(name, value as string);
    }
  }
}
function setAttributes<A extends object>(node: Element, attributes: A) {
  for (const name in attributes) attr(node, name, attributes[name]);
}
function xlinkAttr(node: Element, name: string, value: string) {
  node.setAttributeNS("http://www.w3.org/1999/xlink", name, value);
}
function childNodes(node: Node): Runtime.ClaimNodes {
  return Array.from(node.childNodes);
}
function initClaimInfo(
  nodes: Runtime.ClaimNodes,
): asserts nodes is Runtime.ClaimNodes & {
  claim_info: Runtime.ClaimInfo;
} {
  if (nodes.claim_info === void 0) {
    nodes.claim_info = {
      last_index: 0,
      total_claimed: 0,
    };
  }
}
function claimNode<N extends Runtime.HydrationNode>(
  nodes: Runtime.ClaimNodes,
  matches: (node: Runtime.HydrationNode) => node is N,
  process: (node: N) => Runtime.HydrationNode | void,
  create: () => N,
  preserveLastIndex: boolean = false,
): N {
  initClaimInfo(nodes);
  const claimed = (() => {
    for (
      let index = nodes.claim_info.last_index;
      index < nodes.length;
      index++
    ) {
      const node = nodes[index];
      if (matches(node)) {
        const replacement = process(node);
        if (replacement === void 0) {
          nodes.splice(index, 1);
        } else {
          nodes[index] = replacement;
        }
        if (!preserveLastIndex) {
          nodes.claim_info.last_index = index;
        }
        return node;
      }
    }
    for (let index = nodes.claim_info.last_index - 1; index >= 0; index--) {
      const node = nodes[index];
      if (matches(node)) {
        const replacement = process(node);
        if (replacement === void 0) {
          nodes.splice(index, 1);
        } else {
          nodes[index] = replacement;
        }
        if (preserveLastIndex) {
          if (replacement === void 0) {
            nodes.claim_info.last_index--;
          }
        } else {
          nodes.claim_info.last_index = index;
        }
        return node;
      }
    }
    return create();
  })();
  claimed.claim_order = nodes.claim_info.total_claimed;
  nodes.claim_info.total_claimed += 1;
  return claimed;
}
function claimElementBase<E extends Element>(
  nodes: Runtime.ClaimNodes,
  name: string,
  attributes: Record<string, unknown>,
  create: (name: keyof SVGElementTagNameMap) => E,
): E {
  return claimNode(
    nodes,
    (node: Runtime.HydrationNode): node is E => node.nodeName === name,
    (node: E) => {
      const removed = [];
      for (let index = 0; index < node.attributes.length; index++) {
        const attribute = node.attributes[index];
        if (!attributes[attribute.name]) {
          removed.push(attribute.name);
        }
      }
      removed.forEach((index: string) => node.removeAttribute(index));
    },
    () => create(name as keyof SVGElementTagNameMap),
  );
}
function claimSvg<K extends keyof SVGElementTagNameMap>(
  nodes: Runtime.ClaimNodes,
  name: K,
  attributes: Record<string, unknown>,
): SVGElementTagNameMap[K] {
  return claimElementBase<SVGElementTagNameMap[K]>(
    nodes,
    name,
    attributes,
    svgElement as (name: string) => SVGElementTagNameMap[K],
  );
}
function claimText(nodes: Runtime.ClaimNodes, value: unknown): Text {
  return claimNode(
    nodes,
    (node: Runtime.HydrationNode): node is Text => node.nodeType === 3,
    (node: Text) => {
      const content = "" + value;
      if (node.data.startsWith(content)) {
        if (node.data.length !== content.length)
          return node.splitText(content.length);
      } else node.data = content;
    },
    () => text(value),
    true, // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
  );
}
function setData(node: Text, value: unknown) {
  value = "" + value;
  if (node.data !== value) {
    node.data = value as string;
  }
}
function setStyle(
  node: HTMLElement | SVGElement,
  name: string,
  value: unknown,
  important?: boolean,
) {
  if (value == null) {
    node.style.removeProperty(name);
  } else {
    node.style.setProperty(name, value as string, "");
  }
}
function toggleClass(node: Element, name: string, enabled: unknown) {
  node.classList.toggle(name, !!enabled);
}
function customEvent<T>(
  type: string,
  detail?: T,
  { bubbles = false, cancelable = false }: CustomEventInit<T> = {},
) {
  return new CustomEvent(type, {
    detail,
    bubbles,
    cancelable,
  });
}
function childSlotNames(node: Node): Record<string, boolean> {
  const slots: Record<string, boolean> = {};
  node.childNodes.forEach(
    (
      child: ChildNode & {
        slot?: string;
      },
    ) => {
      slots[child.slot || "default"] = true;
    },
  );
  return slots;
}
const stylesheetMap: Map<Document | ShadowRoot, Runtime.StyleSheetState> =
  /* @__PURE__ */ new Map();
let activeAnimations = 0;
function hash(text: string) {
  let hash = 5381,
    index = text.length;
  for (; index--;) hash = ((hash << 5) - hash) ^ text.charCodeAt(index);
  return hash >>> 0;
}
function createStylesheetState(root: Document | ShadowRoot, node: Node) {
  const state = {
    stylesheet: appendEmptyStylesheet(node),
    rules: {} as Record<string, boolean>,
  };
  stylesheetMap.set(root, state);
  return state;
}
function createRule(
  node: HTMLElement,
  from: number,
  to: number,
  duration: number,
  delay: number,
  easing: (progress: number) => number,
  css: (progress: number, remaining: number) => string,
  uid: number = 0,
) {
  const step = 16.666 / duration;
  let keyframes = `{
`;
  for (let progress = 0; progress <= 1; progress += step) {
    const value = from + (to - from) * easing(progress);
    keyframes +=
      progress * 100 +
      `%{${css(value, 1 - value)}}
`;
  }
  const rule =
      keyframes +
      `100% {${css(to, 1 - to)}}
}`,
    name = `__svelte_${hash(rule)}_${uid}`,
    root = styleRoot(node),
    { stylesheet, rules } =
      stylesheetMap.get(root) || createStylesheetState(root, node);
  if (!rules[name]) {
    rules[name] = true;
    stylesheet.insertRule(
      `@keyframes ${name} ${rule}`,
      stylesheet.cssRules.length,
    );
  }
  const animation = node.style.animation || "";
  node.style.animation = `${animation ? `${animation}, ` : ""}${name} ${duration}ms linear ${delay}ms 1 both`;
  activeAnimations += 1;
  return name;
}
function deleteRule(node: HTMLElement, name?: string) {
  const animations = (node.style.animation || "").split(", "),
    remaining = animations.filter(
      name
        ? (animation: string) => animation.indexOf(name) < 0
        : (animation: string) => animation.indexOf("__svelte") === -1,
      // remove all Svelte animations
    ),
    removed = animations.length - remaining.length;
  if (removed) {
    node.style.animation = remaining.join(", ");
    activeAnimations -= removed;
    if (!activeAnimations) {
      clearRules();
    }
  }
}
function clearRules() {
  requestFrame(() => {
    if (!activeAnimations) {
      stylesheetMap.forEach((state: Runtime.StyleSheetState) => {
        const { ownerNode } = state.stylesheet;
        if (ownerNode) {
          detach(ownerNode);
        }
      });
      stylesheetMap.clear();
    }
  });
}
let currentComponent: Runtime.Component | null | undefined;
function setCurrentComponent(component?: Runtime.Component | null) {
  currentComponent = component;
}
function getCurrentComponent() {
  if (!currentComponent)
    throw new Error("Function called outside component initialization");
  return currentComponent;
}
function onMount(callback: Runtime.MountCallback) {
  getCurrentComponent().$$.on_mount.push(callback);
}
function onDestroy(callback: Runtime.Cleanup) {
  getCurrentComponent().$$.on_destroy!.push(callback);
}
function createEventDispatcher<
  Events extends Record<string, unknown> = Record<string, unknown>,
>() {
  const component = getCurrentComponent();
  return <K extends keyof Events & string>(
    type: K,
    detail?: Events[K],
    {
      cancelable = false,
    }: {
      cancelable?: boolean;
    } = {},
  ) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = customEvent(type, detail, {
        cancelable,
      });
      callbacks.slice().forEach((callback: Runtime.EventCallback) => {
        callback.call(component, event);
      });
      return !event.defaultPrevented;
    }
    return true;
  };
}
function setContext<T>(key: unknown, value: T): T {
  getCurrentComponent().$$.context.set(key, value);
  return value;
}
function getContext<T = unknown>(key: unknown): T | undefined {
  return getCurrentComponent().$$.context.get(key) as T | undefined;
}
function bubble(this: unknown, component: Runtime.Component, event: Event) {
  const callbacks = component.$$.callbacks[event.type];
  if (callbacks) {
    callbacks
      .slice()
      .forEach((callback: Runtime.EventCallback) => callback.call(this, event));
  }
}
const dirtyComponents: Runtime.Component[] = [],
  bindingCallbacks: (() => void)[] = [];
let renderCallbacks: (() => void)[] = [];
const flushCallbacks: (() => void)[] = [],
  resolvedPromise = /* @__PURE__ */ Promise.resolve();
let updateScheduled = false;
function scheduleUpdate() {
  if (!updateScheduled) {
    updateScheduled = true;
    resolvedPromise.then(flush);
  }
}
function tick() {
  scheduleUpdate();
  return resolvedPromise;
}
function addRenderCallback(callback: () => void) {
  renderCallbacks.push(callback);
}
function addFlushCallback(callback: () => void) {
  flushCallbacks.push(callback);
}
const seenCallbacks: Set<() => void> = /* @__PURE__ */ new Set();
let flushIndex = 0;
function flush() {
  if (flushIndex !== 0) return;
  const parent = currentComponent;
  do {
    try {
      for (; flushIndex < dirtyComponents.length;) {
        const component = dirtyComponents[flushIndex];
        flushIndex++;
        setCurrentComponent(component);
        updateComponent(component.$$);
      }
    } catch (error) {
      throw ((dirtyComponents.length = 0), (flushIndex = 0), error);
    }
    for (
      setCurrentComponent(null), dirtyComponents.length = 0, flushIndex = 0;
      bindingCallbacks.length;
    )
      bindingCallbacks.pop()!();
    for (
      let component = 0;
      component < renderCallbacks.length;
      component += 1
    ) {
      const callback = renderCallbacks[component];
      if (!seenCallbacks.has(callback)) {
        seenCallbacks.add(callback);
        callback();
      }
    }
    renderCallbacks.length = 0;
  } while (dirtyComponents.length);
  for (; flushCallbacks.length;) flushCallbacks.pop()!();
  updateScheduled = false;
  seenCallbacks.clear();
  setCurrentComponent(parent);
}
function updateComponent<C extends Runtime.Context>(
  state: Runtime.ComponentState<C>,
) {
  if (state.fragment !== null) {
    state.update();
    runAll(state.before_update);
    const dirty = state.dirty;
    state.dirty = [-1];
    if (state.fragment) {
      state.fragment.update!(state.ctx as C, dirty);
    }
    state.after_update.forEach(addRenderCallback);
  }
}
function flushRenderCallbacks(callbacks: (() => void)[]) {
  const remaining: (() => void)[] = [],
    pending: (() => void)[] = [];
  renderCallbacks.forEach((callback: () => void) =>
    callbacks.indexOf(callback) === -1
      ? remaining.push(callback)
      : pending.push(callback),
  );
  pending.forEach((callback: () => void) => callback());
  renderCallbacks = remaining;
}
let pendingMicrotask: Promise<void> | null;
function wait() {
  if (!pendingMicrotask) {
    pendingMicrotask = Promise.resolve();
    pendingMicrotask.then(() => {
      pendingMicrotask = null;
    });
  }
  return pendingMicrotask;
}
function dispatchTransitionEvent(
  node: HTMLElement,
  intro: boolean,
  phase: string,
) {
  node.dispatchEvent(customEvent(`${intro ? "intro" : "outro"}${phase}`));
}
const outroingFragments: Set<Runtime.FragmentLifecycle> =
  /* @__PURE__ */ new Set();
let outroGroup: Runtime.OutroGroup | undefined;
function groupOutros() {
  outroGroup = {
    pending: 0,
    callbacks: [],
    parent: outroGroup,
    // parent group
  };
}
function checkOutros() {
  if (!outroGroup!.pending) {
    runAll(outroGroup!.callbacks);
  }
  outroGroup = outroGroup!.parent;
}
function transitionIn(
  fragment: Runtime.FragmentLifecycle | false | 0 | "" | null | undefined,
  local?: Runtime.TransitionFlag,
) {
  if (fragment && fragment.intro) {
    outroingFragments.delete(fragment);
    fragment.intro(local);
  }
}
function transitionOut(
  fragment: Runtime.FragmentLifecycle | false | 0 | "" | null | undefined,
  local?: Runtime.TransitionFlag,
  detaching?: Runtime.TransitionFlag,
  callback?: () => void,
) {
  if (fragment && fragment.outro) {
    if (outroingFragments.has(fragment)) return;
    outroingFragments.add(fragment);
    outroGroup!.callbacks.push(() => {
      outroingFragments.delete(fragment);
      if (callback) {
        if (detaching) {
          fragment.destroy(1);
        }
        callback();
      }
    });
    fragment.outro(local);
  } else if (callback) {
    callback();
  }
}
const noTransition = {
  duration: 0,
};
function createInTransition<P>(
  node: HTMLElement,
  transition: Runtime.TransitionFactory<P>,
  params: P,
) {
  const options: Runtime.TransitionOptions = {
    direction: "in",
  };
  let config = transition(node, params, options),
    running = false,
    animation: string | undefined,
    task: Runtime.Loop | undefined,
    uid = 0;
  function clearAnimation() {
    if (animation) {
      deleteRule(node, animation);
    }
  }
  function start() {
    const {
      delay = 0,
      duration = 300,
      easing = identity,
      tick = noop,
      css,
    } = (config || noTransition) as Runtime.TransitionConfig;
    if (css) {
      animation = createRule(node, 0, 1, duration, delay, easing, css, uid++);
    }
    tick(0, 1);
    const startAt = now() + delay,
      endAt = startAt + duration;
    if (task) {
      task.abort();
    }
    running = true;
    addRenderCallback(() => dispatchTransitionEvent(node, true, "start"));
    task = loop((time: number) => {
      if (running) {
        if (time >= endAt) {
          tick(1, 0);
          dispatchTransitionEvent(node, true, "end");
          clearAnimation();
          return (running = false);
        }
        if (time >= startAt) {
          const progress = easing((time - startAt) / duration);
          tick(progress, 1 - progress);
        }
      }
      return running;
    });
  }
  let started = false;
  return {
    start() {
      if (!started) {
        started = true;
        deleteRule(node);
        if (isFunction(config)) {
          config = (
            config as (
              options: Runtime.TransitionOptions,
            ) => Runtime.TransitionConfig
          )(options);
          wait().then(start);
        } else {
          start();
        }
      }
    },
    invalidate() {
      started = false;
    },
    end() {
      if (running) {
        clearAnimation();
        running = false;
      }
    },
  };
}
function createOutTransition<P>(
  node: HTMLElement,
  transition: Runtime.TransitionFactory<P>,
  params: P,
) {
  const options: Runtime.TransitionOptions = {
    direction: "out",
  };
  let config = transition(node, params, options),
    running = true,
    animation: string | undefined;
  const group = outroGroup!;
  group.pending += 1;
  let previousInert: boolean | undefined;
  function start() {
    const {
      delay = 0,
      duration = 300,
      easing = identity,
      tick = noop,
      css,
    } = (config || noTransition) as Runtime.TransitionConfig;
    if (css) {
      animation = createRule(node, 1, 0, duration, delay, easing, css);
    }
    const startAt = now() + delay,
      endAt = startAt + duration;
    addRenderCallback(() => dispatchTransitionEvent(node, false, "start"));
    if ("inert" in node) {
      previousInert = node.inert;
      node.inert = true;
    }
    loop((time: number) => {
      if (running) {
        if (time >= endAt) {
          tick(0, 1);
          dispatchTransitionEvent(node, false, "end");
          if (!--group.pending) {
            runAll(group.callbacks);
          }
          return false;
        }
        if (time >= startAt) {
          const progress = easing((time - startAt) / duration);
          tick(1 - progress, progress);
        }
      }
      return running;
    });
  }
  if (isFunction(config)) {
    wait().then(() => {
      config = (
        config as (
          options: Runtime.TransitionOptions,
        ) => Runtime.TransitionConfig
      )(options);
      start();
    });
  } else {
    start();
  }
  return {
    end(reset?: Runtime.TransitionFlag) {
      if (reset && "inert" in node) {
        node.inert = previousInert!;
      }
      if (reset && (config as Runtime.TransitionConfig).tick) {
        (config as Runtime.TransitionConfig).tick!(1, 0);
      }
      if (running) {
        if (animation) {
          deleteRule(node, animation);
        }
        running = false;
      }
    },
  };
}
function arrayLike<T>(value: ArrayLike<T> | Iterable<T>): ArrayLike<T> {
  return (value == null ? void 0 : (value as ArrayLike<T>).length) !== void 0
    ? (value as ArrayLike<T>)
    : Array.from(value as Iterable<T>);
}
function spreadUpdate(
  levels: Runtime.Props[],
  updates: (Runtime.Props | false | 0 | undefined)[],
): Runtime.Props {
  const result: Runtime.Props = {},
    removed: Record<string, boolean | number> = {},
    accounted: Record<string, boolean | number> = {
      $$scope: 1,
    };
  let index = levels.length;
  for (; index--;) {
    const previous = levels[index],
      update = updates[index];
    if (update) {
      for (const key in previous)
        if (!(key in update)) {
          removed[key] = 1;
        }
      for (const key in update)
        if (!accounted[key]) {
          result[key] = update[key];
          accounted[key] = 1;
        }
      levels[index] = update;
    } else for (const key in previous) accounted[key] = 1;
  }
  for (const previous in removed)
    if (!(previous in result)) {
      result[previous] = void 0;
    }
  return result;
}
function bindProp<T extends Runtime.Component, K extends keyof T & string>(
  component: T,
  name: K,
  callback: Runtime.BindingCallback<T[K]>,
) {
  const index = component.$$.props[name];
  if (index !== void 0) {
    component.$$.bound[index] = callback;
    callback(component.$$.ctx[index] as T[K]);
  }
}
function createFragment(
  fragment: Runtime.FragmentLifecycle | false | 0 | "" | null | undefined,
) {
  if (fragment) {
    fragment.create();
  }
}
function mountComponent<C extends Runtime.Context, P extends object>(
  component: Runtime.Component<C, P>,
  target: Runtime.DomParent,
  anchor?: Node | null,
) {
  const { fragment, after_update } = component.$$;
  if (fragment) {
    fragment.mount(target, anchor);
  }
  addRenderCallback(() => {
    const n = component.$$.on_mount.map(run).filter(isFunction);
    if (component.$$.on_destroy) {
      component.$$.on_destroy!.push(...n);
    } else {
      runAll(n);
    }
    component.$$.on_mount = [];
  });
  after_update.forEach(addRenderCallback);
}
function destroyComponent<C extends Runtime.Context, P extends object>(
  component: Runtime.Component<C, P>,
  detaching?: Runtime.TransitionFlag,
) {
  const state = component.$$;
  if (state.fragment !== null) {
    flushRenderCallbacks(state.after_update);
    runAll(state.on_destroy!);
    if (state.fragment) {
      state.fragment.destroy(detaching);
    }
    state.on_destroy = state.fragment = null;
    state.ctx = [];
  }
}
function makeDirty<C extends Runtime.Context, P extends object>(
  component: Runtime.Component<C, P>,
  index: number,
) {
  if (component.$$.dirty[0] === -1) {
    dirtyComponents.push(component as Runtime.Component);
    scheduleUpdate();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[(index / 31) | 0] |= 1 << (index % 31);
}
function initComponent<C extends Runtime.Context, P extends object>(
  component: Runtime.Component<C, P>,
  options: Runtime.ComponentOptions<P>,
  instance: Runtime.Instance<C, P> | null,
  createView: ((context: C) => Runtime.Fragment<C>) | null,
  notEqual: (previous: unknown, next: unknown) => unknown,
  props: Record<string, number>,
  appendStyles: ((root: Runtime.DomParent) => void) | null = null,
  dirty: number[] = [-1],
) {
  const parent = currentComponent;
  setCurrentComponent(component as Runtime.Component);
  const state: Runtime.ComponentState<C> = (component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal: notEqual,
    bound: blankObject(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent ? parent.$$.context : [])),
    // everything else
    callbacks: blankObject(),
    dirty,
    skip_bound: false,
    root: options.target || parent!.$$.root,
  });
  if (appendStyles) {
    appendStyles(state.root);
  }
  let ready = false;
  state.ctx = instance
    ? instance(
        component,
        (options.props || {}) as P,
        <T>(index: number, result: T, ...values: unknown[]) => {
          const value = values.length ? values[0] : result;
          if (
            state.ctx &&
            notEqual(state.ctx[index], (state.ctx[index] = value))
          ) {
            if (!state.skip_bound && state.bound[index]) {
              state.bound[index](value);
            }
            if (ready) {
              makeDirty(component, index);
            }
          }
          return result;
        },
      )
    : [];
  state.update();
  ready = true;
  runAll(state.before_update);
  state.fragment = createView ? createView(state.ctx as C) : false;
  if (options.target) {
    if (options.hydrate) {
      startHydrating();
      const index = childNodes(options.target);
      if (state.fragment) {
        state.fragment.claim!(index);
      }
      index.forEach(detach);
    } else if (state.fragment) {
      state.fragment.create();
    }
    if (options.intro) {
      transitionIn(component.$$.fragment);
    }
    mountComponent(component, options.target, options.anchor);
    endHydrating();
    flush();
  }
  setCurrentComponent(parent);
}
let CustomElementBase: new (
  Component: Runtime.ComponentConstructor,
  slots: string[],
  shadow: boolean,
) => SvelteElement;
if (typeof HTMLElement == "function") {
  CustomElementBase = class extends HTMLElement {
    declare listenerUnsubscribers: Map<
      EventListenerOrEventListenerObject | null,
      () => void
    >;
    declare listeners: Record<
      string,
      (EventListenerOrEventListenerObject | null)[]
    >;
    declare propDefinitions: Runtime.ElementPropDefinitions;
    declare reflecting: boolean;
    declare propValues: Runtime.Props;
    declare connected: boolean;
    declare component: Runtime.Component | undefined;
    declare slotNames: string[];
    declare componentConstructor: Runtime.ComponentConstructor;
    [key: string]: unknown;
    constructor(
      Component: Runtime.ComponentConstructor,
      slots: string[],
      shadow: boolean,
    ) {
      super();
      defineField(this, "componentConstructor");
      defineField(this, "slotNames");
      defineField(this, "component");
      defineField(this, "connected", false);
      defineField(this, "propValues", {});
      defineField(this, "reflecting", false);
      defineField(this, "propDefinitions", {});
      defineField(this, "listeners", {});
      defineField(this, "listenerUnsubscribers", /* @__PURE__ */ new Map());
      this.componentConstructor = Component;
      this.slotNames = slots;
      if (shadow) {
        this.attachShadow({
          mode: "open",
        });
      }
    }
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions | undefined,
    ) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(listener);
      if (this.component) {
        const unsubscribe = this.component.$on(type, listener);
        this.listenerUnsubscribers.set(listener, unsubscribe);
      }
      super.addEventListener(type, listener!, options);
    }
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions | undefined,
    ) {
      super.removeEventListener(type, listener!, options);
      if (this.component) {
        const unsubscribe = this.listenerUnsubscribers.get(listener);
        if (unsubscribe) {
          unsubscribe();
          this.listenerUnsubscribers.delete(listener);
        }
      }
      if (this.listeners[type]) {
        const index = this.listeners[type].indexOf(listener);
        if (index >= 0) {
          this.listeners[type].splice(index, 1);
        }
      }
    }
    async connectedCallback() {
      this.connected = true;
      if (!this.component) {
        let createSlot = function (name: string) {
          return () => {
            let slot: HTMLSlotElement;
            return {
              create: function () {
                slot = element("slot");
                if (name !== "default") {
                  attr(slot, "name", name);
                }
              },
              mount: function (
                target: Runtime.DomParent,
                anchor?: Node | null,
              ) {
                insert(target, slot, anchor);
              },
              destroy: function (target?: Runtime.TransitionFlag) {
                if (target) {
                  detach(slot);
                }
              },
            };
          };
        };
        await Promise.resolve();
        if (!this.connected || this.component) return;
        const $$slots: Record<string, [() => Partial<Runtime.Fragment>]> = {},
          availableSlots = childSlotNames(this);
        for (const name of this.slotNames)
          if (name in availableSlots) {
            $$slots[name] = [createSlot(name)];
          }
        for (const attribute of this.attributes) {
          const property = this.propForAttribute(attribute.name);
          if (!(property in this.propValues)) {
            this.propValues[property] = coerceElementProp(
              property,
              attribute.value,
              this.propDefinitions,
              "toProp",
            );
          }
        }
        for (const property in this.propDefinitions)
          if (!(property in this.propValues) && this[property] !== void 0) {
            this.propValues[property] = this[property];
            delete this[property];
          }
        this.component = new this.componentConstructor({
          target: this.shadowRoot || this,
          props: {
            ...this.propValues,
            $$slots,
            $$scope: {
              ctx: [],
            },
          },
        });
        const reflectProps = () => {
          this.reflecting = true;
          for (const property in this.propDefinitions) {
            this.propValues[property] =
              this.component!.$$.ctx[this.component!.$$.props[property]];
            if (this.propDefinitions[property].reflect) {
              const slot = coerceElementProp(
                property,
                this.propValues[property],
                this.propDefinitions,
                "toAttribute",
              );
              if (slot == null) {
                this.removeAttribute(
                  this.propDefinitions[property].attribute || property,
                );
              } else {
                this.setAttribute(
                  this.propDefinitions[property].attribute || property,
                  slot as string,
                );
              }
            }
          }
          this.reflecting = false;
        };
        this.component.$$.after_update.push(reflectProps);
        reflectProps();
        for (const type in this.listeners)
          for (const listener of this.listeners[type]) {
            const unsubscribe = this.component.$on(type, listener);
            this.listenerUnsubscribers.set(listener, unsubscribe);
          }
        this.listeners = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      value: string | null,
    ) {
      var component: Runtime.Component | undefined;
      if (!this.reflecting) {
        name = this.propForAttribute(name);
        this.propValues[name] = coerceElementProp(
          name,
          value,
          this.propDefinitions,
          "toProp",
        );
        if (!((component = this.component) == null)) {
          component.$set({
            [name]: this.propValues[name],
          });
        }
      }
    }
    disconnectedCallback() {
      this.connected = false;
      Promise.resolve().then(() => {
        if (!this.connected && this.component) {
          this.component.$destroy();
          this.component = void 0;
        }
      });
    }
    propForAttribute(attribute: string) {
      return (
        Object.keys(this.propDefinitions).find(
          (name: string) =>
            this.propDefinitions[name].attribute === attribute ||
            (!this.propDefinitions[name].attribute &&
              name.toLowerCase() === attribute),
        ) || attribute
      );
    }
  };
}
function coerceElementProp(
  name: string,
  value: unknown,
  definitions: Runtime.ElementPropDefinitions,
  direction?: "toProp" | "toAttribute",
) {
  var definition: Runtime.ElementPropDefinition | undefined;
  const type =
    (definition = definitions[name]) == null ? void 0 : definition.type;
  value =
    type === "Boolean" && typeof value != "boolean" ? value != null : value;
  if (!direction || !definitions[name]) return value;
  if (direction === "toAttribute")
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value ?? null;
      default:
        return value;
    }
  else
    switch (type) {
      case "Object":
      case "Array":
        return value && (JSON.parse(value as string) as unknown);
      case "Boolean":
        return value;
      case "Number":
        return value != null ? +(value as number) : value;
      default:
        return value;
    }
}
function createSvelteCustomElement<C extends Runtime.Context, P extends object>(
  Component: Runtime.ComponentConstructor<C, P>,
  definitions: Runtime.ElementPropDefinitions,
  slots: string[],
  accessors: string[],
  shadow: boolean,
  extend?: unknown,
) {
  let ElementClass = class extends CustomElementBase {
    [key: string]: unknown;
    constructor() {
      super(Component as Runtime.ComponentConstructor, slots, shadow);
      this.propDefinitions = definitions;
    }
    static get observedAttributes() {
      return Object.keys(definitions).map((name: string) =>
        (definitions[name].attribute || name).toLowerCase(),
      );
    }
  };
  Object.keys(definitions).forEach((name: string) => {
    Object.defineProperty(ElementClass.prototype, name, {
      get(this: SvelteElement) {
        return this.component && name in this.component
          ? (this.component as Runtime.Component & Runtime.Props)[name]
          : this.propValues[name];
      },
      set(this: SvelteElement, value?: unknown) {
        var component: Runtime.Component | undefined;
        value = coerceElementProp(name, value, definitions);
        this.propValues[name] = value;
        if (!((component = this.component) == null)) {
          component.$set({
            [name]: value,
          });
        }
      },
    });
  });
  accessors.forEach((name: string) => {
    Object.defineProperty(ElementClass.prototype, name, {
      get(this: SvelteElement) {
        var value: Runtime.Component | undefined;
        return (value = this.component) == null
          ? void 0
          : (value as Runtime.Component & Runtime.Props)[name];
      },
    });
  });
  Component.element = ElementClass;
  return ElementClass;
}
class SvelteComponent<
  C extends Runtime.Context = Runtime.Context,
  P extends object = Runtime.Props,
> {
  declare $$set: ((props: Partial<P>) => void) | undefined;
  declare $$: Runtime.ComponentState<C>;
  declare static element: CustomElementConstructor;
  constructor() {
    defineField(this, "$$");
    defineField(this, "$$set");
  }
  $destroy() {
    destroyComponent(this, 1);
    this.$destroy = noop;
  }
  $on(
    type: string,
    callback?: Runtime.EventCallback | EventListenerObject | null,
  ) {
    if (!isFunction(callback)) return noop;
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  $set(props: Partial<P>) {
    if (this.$$set && !isEmpty(props)) {
      this.$$.skip_bound = true;
      this.$$set(props);
      this.$$.skip_bound = false;
    }
  }
}
const svelteVersion = "4";
if (typeof window < "u") {
  (
    window.__svelte ||
    (window.__svelte = {
      v: /* @__PURE__ */ new Set(),
    })
  ).v.add(svelteVersion);
}
const subscriberQueue: unknown[] = [];
function readable<T>(value: T, start?: StartStopNotifier<T>): Readable<T> {
  return {
    subscribe: writable(value, start).subscribe,
  };
}
function writable<T>(
  value: T,
  start: StartStopNotifier<T> = noop,
): Writable<T> {
  let stop: Unsubscribe | null | undefined;
  const subscribers: Set<[(value: T) => void, () => void]> =
    /* @__PURE__ */ new Set();
  function set(next: T) {
    if (safeNotEqual(value, next) && ((value = next), stop)) {
      const queueEmpty = !subscriberQueue.length;
      for (const subscription of subscribers) {
        subscription[1]();
        subscriberQueue.push(subscription, value);
      }
      if (queueEmpty) {
        for (
          let subscription = 0;
          subscription < subscriberQueue.length;
          subscription += 2
        )
          (
            subscriberQueue[subscription] as [
              (value: unknown) => void,
              () => void,
            ]
          )[0](subscriberQueue[subscription + 1]);
        subscriberQueue.length = 0;
      }
    }
  }
  function update(updater: (value: T) => T) {
    set(updater(value));
  }
  function subscribeToStore(
    run: (value: T) => void,
    invalidate: () => void = noop,
  ) {
    const subscription: [(value: T) => void, () => void] = [run, invalidate];
    subscribers.add(subscription);
    if (subscribers.size === 1) {
      stop = start(set, update) || noop;
    }
    run(value);
    return () => {
      subscribers.delete(subscription);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return {
    set,
    update,
    subscribe: subscribeToStore,
  };
}
export {
  SvelteComponent,
  addFlushCallback,
  addRenderCallback,
  append,
  appendStyles,
  assign,
  attr,
  onMount,
  arrayLike,
  bindingCallbacks,
  bubble,
  checkOutros,
  xlinkAttr,
  bindProp,
  claimSvg,
  claimText,
  spreadUpdate,
  createEventDispatcher,
  createFragment,
  createInTransition,
  createOutTransition,
  publicProps,
  createSvelteCustomElement,
  destroyComponent,
  destroyEach,
  detach,
  element,
  empty,
  flush,
  getContext,
  setAttributes,
  appendHydrated,
  actionDestroyer,
  childNodes,
  getStore,
  globals,
  groupOutros,
  initComponent,
  insert,
  insertHydration,
  isFunction,
  listen,
  mountComponent,
  noop,
  onDestroy,
  readable,
  runAll,
  safeNotEqual,
  setContext,
  setData,
  setStyle,
  space,
  subscribe,
  subscribeComponent,
  svgElement,
  text,
  tick,
  toggleClass,
  transitionIn,
  transitionOut,
  writable,
};
interface SvelteElement extends HTMLElement {
  [key: string]: unknown;
  componentConstructor: Runtime.ComponentConstructor;
  slotNames: string[];
  component: Runtime.Component | undefined;
  connected: boolean;
  propValues: Runtime.Props;
  reflecting: boolean;
  propDefinitions: Runtime.ElementPropDefinitions;
  listeners: Record<string, (EventListenerOrEventListenerObject | null)[]>;
  listenerUnsubscribers: Map<
    EventListenerOrEventListenerObject | null,
    () => void
  >;
}
