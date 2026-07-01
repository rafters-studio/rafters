/**
 * The Behavior Contract (Spec 01 -- packages/ui/docs/spec/01-behavior-contract.md).
 *
 * Every x.behavior.ts exports a BehaviorSpec satisfying this contract. The
 * conformance harness, the classes layer, and every framework binding
 * compile against these types. Reducers, canDispatch, aria, keymap, and
 * effects are pure; anything impure is an EffectSpec (effects.ts).
 */
import { createMemory, type Memory } from '../primitives/memory';
import type { EffectSpec } from './effects';

/** Normalized keyboard input. Bindings translate their native events into
 *  this shape; a behavior never sees a framework event. */
export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export type AriaValue = string | boolean | undefined;

/** role, aria-*, data-*. A value of `undefined` means "attribute absent" --
 *  bindings must remove, not render, such attributes. */
export type AriaAttrs = Record<string, AriaValue>;

export interface PartDecl {
  /** ARIA role this part must carry, if any. The harness asserts it. */
  role?: string;
  /** Part occurs zero-or-more times (item[]). */
  many?: boolean;
  /** Part is present only in some states (e.g. spinner while loading). */
  optional?: boolean;
}

/** SSR-stable element ids, supplied by the framework binding (React useId,
 *  WC instance counter). A behavior never generates ids. */
export type PartIds<Part extends string> = Record<Part, string>;

/** Action name -> payload type. Use `undefined` for payload-less actions. */
export type ActionPayloads = Record<string, unknown>;

/** Conditional tuple so payload-less actions dispatch as dispatch('press'). */
export type PayloadArgs<P> = P extends undefined ? [] : [payload: P];

export interface BehaviorSpec<Config, State, Actions extends ActionPayloads, Part extends string> {
  name: string;
  parts: Record<Part, PartDecl>;
  initialState: (config: Config) => State;

  /** Pure reducers. No DOM, no timers, no callbacks. */
  actions: {
    [K in keyof Actions]: (state: State, payload: Actions[K]) => State;
  };

  /** Pure gate: may this action fire in this state? Bindings consult it
   *  before applying the reducer AND before invoking consumer callbacks.
   *  Suppression logic (disabled, loading, soft-disabled) lives here,
   *  never in a framework file. */
  canDispatch: (state: State, action: keyof Actions) => boolean;

  /** The auditable ARIA contract, keyed by part. */
  aria: (state: State, config: Config, ids: PartIds<Part>) => Partial<Record<Part, AriaAttrs>>;

  /** Keyboard contract, keyed by the part receiving the event. Returns the
   *  action to dispatch, or null (event not claimed). */
  keymap: (event: KeyInput, state: State, part: Part) => keyof Actions | null;

  /** Declarative effect requests for the current state (effects.ts). */
  effects: (state: State, config: Config) => EffectSpec[];
}

export interface BehaviorInstance<
  Config,
  State,
  Actions extends ActionPayloads,
  Part extends string,
> {
  readonly spec: BehaviorSpec<Config, State, Actions, Part>;
  readonly config: Config;
  readonly memory: Memory<State>;
  /** Applies the reducer iff canDispatch allows it. Returns acceptance. */
  dispatch<K extends keyof Actions>(action: K, ...payload: PayloadArgs<Actions[K]>): boolean;
  /** Current-state projections, bound to config. */
  aria(ids: PartIds<Part>): Partial<Record<Part, AriaAttrs>>;
  keymap(event: KeyInput, part: Part): keyof Actions | null;
  effects(): EffectSpec[];
}

/** One instance owns exactly one memory cell. */
export function createBehavior<Config, State, Actions extends ActionPayloads, Part extends string>(
  spec: BehaviorSpec<Config, State, Actions, Part>,
  config: Config,
): BehaviorInstance<Config, State, Actions, Part> {
  const memory = createMemory<State>(() => spec.initialState(config));

  return {
    spec,
    config,
    memory,
    dispatch(action, ...payload) {
      const state = memory.get();
      if (!spec.canDispatch(state, action)) return false;
      memory.set(spec.actions[action](state, payload[0] as Actions[typeof action]));
      return true;
    },
    aria: (ids) => spec.aria(memory.get(), config, ids),
    keymap: (event, part) => spec.keymap(event, memory.get(), part),
    effects: () => spec.effects(memory.get(), config),
  };
}
