import type { Unsubscribe, Subscriber } from "../types.js";

export type Context = unknown[];
export type Props = Record<string, unknown>;
export type DomParent = Node & ParentNode;
export type TransitionFlag = boolean | number;
export type Cleanup = () => void;
export type MountCallback = () => void | Cleanup;
export type EventCallback<E extends Event = Event> = {
  handle(this: unknown, event: E): void;
}["handle"];

export interface FragmentLifecycle {
  create(): void;
  mount(target: DomParent, anchor?: Node | null): void;
  intro?(local?: TransitionFlag): void;
  outro?(local?: TransitionFlag): void;
  destroy(detaching?: TransitionFlag): void;
}
export interface Fragment<
  C extends Context = Context,
  Dirty = number[],
> extends FragmentLifecycle {
  claim?(nodes: ClaimNodes): void;
  hydrate?(): void;
  update?(context: C, dirty: Dirty): void;
}
export interface ComponentState<C extends Context = Context> {
  fragment: Fragment<C> | false | null;
  ctx: C | [];
  props: Record<string, number>;
  update(): void;
  not_equal(previous: unknown, next: unknown): unknown;
  bound: Record<number, BindingCallback<unknown>>;
  on_mount: MountCallback[];
  on_destroy: Cleanup[] | null;
  on_disconnect: Cleanup[];
  before_update: Cleanup[];
  after_update: Cleanup[];
  context: Map<unknown, unknown>;
  callbacks: Record<string, EventCallback[]>;
  dirty: number[];
  skip_bound: boolean;
  root: DomParent;
}
export interface Component<
  C extends Context = Context,
  P extends object = Props,
> {
  $$: ComponentState<C>;
  $$set?(props: Partial<P>): void;
  $set(props: Partial<P>): void;
  $on<E extends Event>(
    type: string,
    callback?: EventCallback<E> | EventListenerObject | null,
  ): Cleanup;
  $destroy(): void;
}
type RequiredKeys<P extends object> = {
  [K in keyof P]-?: {} extends Pick<P, K> ? never : K;
}[keyof P];

export type ComponentOptions<P extends object = Props> = {
  target?: DomParent;
  anchor?: Node | null;
  context?: Iterable<readonly [unknown, unknown]>;
  hydrate?: boolean;
  intro?: boolean;
} & ([RequiredKeys<P>] extends [never] ? { props?: P } : { props: P });
export interface ComponentConstructor<
  C extends Context = Context,
  P extends object = Props,
> {
  new (options: ComponentOptions<P>): Component<C, P>;
  element?: CustomElementConstructor;
}
export type Invalidate = <T>(
  index: number,
  result: T,
  ...values: unknown[]
) => T;
export type Instance<C extends Context, P extends object> = (
  component: Component<C, P>,
  props: P,
  invalidate: Invalidate,
) => C;
export interface Action {
  update?(value: unknown): void;
  destroy?(): void;
}
export interface HydrationNode extends Node {
  claim_order?: number;
}
export interface HydrationParent extends Node, ParentNode {
  hydrate_init?: boolean;
  actual_end_child?: HydrationNode | null;
}
export interface ClaimInfo {
  last_index: number;
  total_claimed: number;
}
export type ClaimNodes = HydrationNode[] & { claim_info?: ClaimInfo };
export interface LoopTask {
  callback(time: number): boolean;
  finish(): void;
}
export interface Loop {
  promise: Promise<void>;
  abort(): void;
}
export interface TransitionConfig {
  delay?: number;
  duration?: number;
  easing?(progress: number): number;
  tick?(progress: number, remaining: number): void;
  css?(progress: number, remaining: number): string;
}
export interface TransitionOptions {
  direction: "in" | "out";
}
export type TransitionFactory<P> = (
  node: HTMLElement,
  params: P,
  options: TransitionOptions,
) => TransitionConfig | ((options: TransitionOptions) => TransitionConfig);
export interface OutroGroup {
  pending: number;
  callbacks: Cleanup[];
  parent?: OutroGroup;
}
export interface StyleSheetState {
  stylesheet: CSSStyleSheet;
  rules: Record<string, boolean>;
}
export interface ElementPropDefinition {
  attribute?: string;
  reflect?: boolean;
  type?: "Object" | "Array" | "Boolean" | "Number" | "String";
}
export type ElementPropDefinitions = Record<string, ElementPropDefinition>;
export interface Observable<T> {
  subscribe(
    run: Subscriber<T>,
    invalidate?: Cleanup,
  ): (Unsubscribe & { unsubscribe?: () => void }) | { unsubscribe(): void };
}

export type BindingCallback<T> = { callback(value: T): void }["callback"];
