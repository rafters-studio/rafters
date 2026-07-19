import { createMemory, type Memory } from '../primitives/memory';

export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export type AriaValue = string | boolean | undefined;
export type AriaAttrs = Record<string, AriaValue>;

export interface PartDecl {
  role?: string;
  many?: boolean;
  optional?: boolean;
}

export type PartIds<Part extends string> = Record<Part, string>;
export type ActionPayloads = Record<string, unknown>;
export type PayloadArgs<P> = P extends undefined ? [] : [payload: P];

export interface BehaviorSpec<Config, State, Actions extends ActionPayloads, Part extends string> {
  name: string;
  parts: Record<Part, PartDecl>;
  initialState: (config: Config) => State;

  actions: {
    [K in keyof Actions]: (state: State, payload: Actions[K]) => State;
  };

  canDispatch: (state: State, action: keyof Actions, config: Config) => boolean;

  aria: (state: State, config: Config, ids: PartIds<Part>) => Partial<Record<Part, AriaAttrs>>;

  keymap: (event: KeyInput, state: State, part: Part, config: Config) => keyof Actions | null;
}

export function createBehavior<Config, State, Actions extends ActionPayloads, Part extends string>(
  spec: BehaviorSpec<Config, State, Actions, Part>,
  initialConfig: Config,
): {
  memory: Memory<State>;
  dispatch: <K extends keyof Actions>(
    action: K,
    config: Config,
    ...payload: PayloadArgs<Actions[K]>
  ) => boolean;
} {
  const memory = createMemory<State>(() => spec.initialState(initialConfig));

  return {
    memory,
    // Config is a parameter, not a capture: suppression must read the
    // caller's CURRENT config, and the instance outlives any one render.
    dispatch(action, config, ...payload) {
      const state = memory.get();
      if (!spec.canDispatch(state, action, config)) return false;
      memory.set(spec.actions[action](state, payload[0] as Actions[typeof action]));
      return true;
    },
  };
}
