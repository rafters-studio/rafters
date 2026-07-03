import * as React from 'react';
import {
  createBehavior,
  type ActionPayloads,
  type AriaAttrs,
  type BehaviorSpec,
  type KeyInput,
  type PartIds,
  type PayloadArgs,
} from '../lib/contract';
import type { EffectHost } from '../lib/effects';
import { useBehaviorEffects } from './use-behavior-effects';
import { useMemory } from './use-memory';

/**
 * The React adapter (boundary 3: one per framework, system-wide).
 *
 * Owns everything a performance repeats: instance lifecycle, memory
 * subscription, id supply, the part registry, the effect host, the effects
 * runner, and the accepted-dispatch protocol. A component's framework file
 * holds only its idiomatic surface -- prop types, JSX structure, consumer
 * callbacks -- over this hook. A framework file that touches memory,
 * createBehavior, or an EffectHost directly is re-expressing the adapter.
 */

export interface UseBehaviorOptions<State, Actions extends ActionPayloads> {
  /** Fired after each ACCEPTED dispatch with the intrinsic state before and
   *  after the reducer. The binding maps this to its consumer callback
   *  (onOpenChange, onValueChange) without duplicating reducer logic. */
  onAccepted?: (action: keyof Actions, before: State, after: State) => void;
  /** Consulted before an EFFECT-initiated dispatch (outside pointerdown).
   *  Return true to veto -- the binding's chance to run consumer veto
   *  callbacks (onPointerDownOutside and friends). */
  vetoEffectDispatch?: (action: keyof Actions, nativeEvent: Event | undefined) => boolean;
}

export interface BehaviorBinding<State, Actions extends ActionPayloads, Part extends string> {
  state: State;
  /** SSR-stable ids for every declared part. Optional parts read '' while
   *  unrendered, so aria projections emit absence, never dangling refs. */
  ids: PartIds<Part>;
  /** The aria projection at the current state/config/ids. */
  aria: Partial<Record<Part, AriaAttrs>>;
  /** The accepted-dispatch protocol: applies the reducer iff canDispatch
   *  allows it under the CURRENT config, then reports through onAccepted.
   *  Returns acceptance. */
  request: <K extends keyof Actions>(action: K, ...payload: PayloadArgs<Actions[K]>) => boolean;
  /** Ref callback registering a part's element. Singleton parts only;
   *  many-part instances are addressed via data attributes in the DOM. */
  setPart: (part: Part) => (element: HTMLElement | null) => void;
  getPart: (part: string) => HTMLElement | null;
}

export function useBehavior<Config, State, Actions extends ActionPayloads, Part extends string>(
  spec: BehaviorSpec<Config, State, Actions, Part>,
  config: Config,
  options: UseBehaviorOptions<State, Actions> = {},
): BehaviorBinding<State, Actions, Part> {
  const { memory, dispatch } = React.useMemo(() => createBehavior(spec, config), []);
  const state = useMemory(memory);

  const partsRef = React.useRef<Map<string, HTMLElement | null>>(new Map());
  const [presentParts, setPresentParts] = React.useState<ReadonlySet<string>>(new Set());

  // One STABLE ref callback per part name: a fresh closure per render would
  // make React detach/reattach the ref every commit, and the presence flips
  // would re-render forever.
  const partCallbacksRef = React.useRef<Map<Part, (element: HTMLElement | null) => void>>(
    new Map(),
  );
  const setPart = React.useCallback(
    (part: Part) => {
      let callback = partCallbacksRef.current.get(part);
      if (!callback) {
        callback = (element: HTMLElement | null) => {
          partsRef.current.set(part, element);
          // Presence only matters for optional parts: their declared
          // absence is what id supply and projections key off.
          if (!spec.parts[part]?.optional) return;
          setPresentParts((previous) => {
            const present = element !== null;
            if (previous.has(part) === present) return previous;
            const next = new Set(previous);
            if (present) {
              next.add(part);
            } else {
              next.delete(part);
            }
            return next;
          });
        };
        partCallbacksRef.current.set(part, callback);
      }
      return callback;
    },
    [spec],
  );

  const getPart = React.useCallback((part: string) => partsRef.current.get(part) ?? null, []);

  const uid = React.useId();
  const ids = {} as PartIds<Part>;
  for (const part of Object.keys(spec.parts) as Part[]) {
    const declaredAbsent = spec.parts[part]?.optional && !presentParts.has(part);
    ids[part] = declaredAbsent ? '' : `${uid}-${part}`;
  }

  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });

  const request = <K extends keyof Actions>(
    action: K,
    ...payload: PayloadArgs<Actions[K]>
  ): boolean => {
    const before = memory.get();
    if (!dispatch(action, config, ...payload)) return false;
    optionsRef.current.onAccepted?.(action, before, memory.get());
    return true;
  };

  const latestRequest = React.useRef(request);
  React.useEffect(() => {
    latestRequest.current = request;
  });
  const hostRef = React.useRef<EffectHost | null>(null);
  hostRef.current ??= {
    getPart,
    dispatch: (action, payload, nativeEvent) => {
      if (optionsRef.current.vetoEffectDispatch?.(action as keyof Actions, nativeEvent)) return;
      latestRequest.current(
        action as keyof Actions,
        ...([payload] as PayloadArgs<Actions[keyof Actions]>),
      );
    },
  };
  useBehaviorEffects(spec.effects(state, config), hostRef.current);

  return {
    state,
    ids,
    aria: spec.aria(state, config, ids),
    request,
    setPart,
    getPart,
  };
}

/** Translate a React keyboard event into the contract's KeyInput. */
export function keyInputOf(event: React.KeyboardEvent): KeyInput {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}
