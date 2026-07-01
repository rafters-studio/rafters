/**
 * The composer (Spec 02 -- packages/ui/docs/spec/02-composer.md).
 *
 * A pure typed fold from slices to one BehaviorSpec. Slices are DATA --
 * fragments of a BehaviorSpec covering one concern. They do not own memory;
 * the composed spec's createBehavior instance owns the single cell of the
 * merged state.
 *
 * Merge rules (per field):
 * - initialState: spread in fold order; a key collision THROWS.
 * - actions: union; a duplicate action name THROWS.
 * - canDispatch: logical AND of all contributors.
 * - aria: per-part shallow merge; a duplicate attribute on the same part
 *   THROWS unless the glue slice sets it (glue overrides).
 * - keymap: exactly one non-glue slice may claim an event; two claims THROW
 *   (resolve the tie in the glue slice, which always wins).
 * - parts: union; duplicate names must carry identical PartDecls.
 * - effects: concatenation.
 *
 * Collisions are component-author bugs, so the throws are unconditional --
 * loud in dev, loud in prod, deterministic in tests.
 */
import type {
  ActionPayloads,
  AriaAttrs,
  BehaviorSpec,
  KeyInput,
  PartDecl,
  PartIds,
} from './contract';
import type { EffectSpec } from './effects';

export interface Slice<Config, State, Actions extends ActionPayloads, Part extends string> {
  name: string;
  parts?: Partial<Record<Part, PartDecl>>;
  initialState: (config: Config) => State;
  actions?: {
    [K in keyof Actions]: (state: State, payload: Actions[K]) => State;
  };
  canDispatch?: (state: State, action: keyof Actions) => boolean;
  aria?: (state: State, config: Config, ids: PartIds<Part>) => Partial<Record<Part, AriaAttrs>>;
  keymap?: (event: KeyInput, state: State, part: Part) => keyof Actions | null;
  effects?: (state: State, config: Config) => EffectSpec[];
}

/**
 * The glue slice: last in the fold, contributes no state, sees the MERGED
 * state, may override aria and claim contested keymap entries.
 */
export interface GlueSlice<
  Config,
  MergedState,
  Actions extends ActionPayloads,
  Part extends string,
> {
  kind: 'glue';
  name: string;
  actions?: {
    [K in keyof Actions]: (state: MergedState, payload: Actions[K]) => MergedState;
  };
  canDispatch?: (state: MergedState, action: keyof Actions) => boolean;
  aria?: (
    state: MergedState,
    config: Config,
    ids: PartIds<Part>,
  ) => Partial<Record<Part, AriaAttrs>>;
  keymap?: (event: KeyInput, state: MergedState, part: Part) => keyof Actions | null;
  effects?: (state: MergedState, config: Config) => EffectSpec[];
}

/**
 * TypeScript intersections do not error on key collisions; this constraint
 * surfaces one as an impossible PARAMETER type naming the colliding keys
 * (an unresolved conditional in the RETURN type is unrelatable to the
 * overload implementation signature -- prototype finding).
 */
export type DisjointFrom<A, B> = [Extract<keyof A, keyof B>] extends [never]
  ? unknown
  : { __stateKeyCollision: Extract<keyof A, keyof B> };

type UnknownState = Record<string, unknown>;
type UnknownSlice = Slice<unknown, UnknownState, ActionPayloads, string>;
type UnknownGlue = GlueSlice<unknown, UnknownState, ActionPayloads, string>;

function isGlue(candidate: UnknownSlice | UnknownGlue): candidate is UnknownGlue {
  return 'kind' in candidate && candidate.kind === 'glue';
}

export function compose<Config, S1 extends object, A1 extends ActionPayloads, P1 extends string>(
  name: string,
  slice: Slice<Config, S1, A1, P1>,
): BehaviorSpec<Config, S1, A1, P1>;
export function compose<
  Config,
  S1 extends object,
  A1 extends ActionPayloads,
  P1 extends string,
  GA extends ActionPayloads,
>(
  name: string,
  slice: Slice<Config, S1, A1, P1>,
  glue: GlueSlice<Config, S1, GA, P1>,
): BehaviorSpec<Config, S1, A1 & GA, P1>;
export function compose<
  Config,
  S1 extends object,
  A1 extends ActionPayloads,
  P1 extends string,
  S2 extends object,
  A2 extends ActionPayloads,
  P2 extends string,
>(
  name: string,
  first: Slice<Config, S1, A1, P1>,
  second: Slice<Config, S2, A2, P2> & DisjointFrom<S2, S1>,
): BehaviorSpec<Config, S1 & S2, A1 & A2, P1 | P2>;
export function compose<
  Config,
  S1 extends object,
  A1 extends ActionPayloads,
  P1 extends string,
  S2 extends object,
  A2 extends ActionPayloads,
  P2 extends string,
  GA extends ActionPayloads,
>(
  name: string,
  first: Slice<Config, S1, A1, P1>,
  second: Slice<Config, S2, A2, P2> & DisjointFrom<S2, S1>,
  glue: GlueSlice<Config, S1 & S2, GA, P1 | P2>,
): BehaviorSpec<Config, S1 & S2, A1 & A2 & GA, P1 | P2>;
export function compose(
  name: string,
  ...rawEntries: ReadonlyArray<object>
): BehaviorSpec<unknown, UnknownState, ActionPayloads, string> {
  const entries = rawEntries as ReadonlyArray<UnknownSlice | UnknownGlue>;
  const glue = entries.filter(isGlue);
  if (glue.length > 1) {
    throw new Error(`compose(${name}): at most one glue slice (got ${glue.length})`);
  }
  if (glue.length === 1 && !isGlue(entries[entries.length - 1] as UnknownSlice | UnknownGlue)) {
    throw new Error(`compose(${name}): the glue slice must be last in the fold`);
  }
  const slices = entries.filter((e): e is UnknownSlice => !isGlue(e));
  if (slices.length === 0) {
    throw new Error(`compose(${name}): at least one non-glue slice is required`);
  }
  const theGlue = glue[0];
  const contributors: ReadonlyArray<UnknownSlice | UnknownGlue> = entries;

  // parts: union; duplicate names must agree exactly.
  const parts: Record<string, PartDecl> = {};
  for (const slice of slices) {
    for (const [part, decl] of Object.entries(slice.parts ?? {})) {
      const existing = parts[part];
      if (existing && JSON.stringify(existing) !== JSON.stringify(decl)) {
        throw new Error(`compose(${name}): part "${part}" declared twice with different PartDecls`);
      }
      parts[part] = decl as PartDecl;
    }
  }

  // actions: union; duplicates throw.
  const actionOwners = new Map<string, string>();
  for (const entry of contributors) {
    for (const action of Object.keys(entry.actions ?? {})) {
      const owner = actionOwners.get(action);
      if (owner) {
        throw new Error(
          `compose(${name}): action "${action}" defined by both "${owner}" and "${entry.name}"`,
        );
      }
      actionOwners.set(action, entry.name);
    }
  }
  const actions: Record<string, (state: UnknownState, payload: unknown) => UnknownState> = {};
  for (const entry of contributors) {
    Object.assign(actions, entry.actions ?? {});
  }

  return {
    name,
    parts,
    initialState: (config) => {
      const merged: UnknownState = {};
      for (const slice of slices) {
        const contribution = slice.initialState(config);
        for (const key of Object.keys(contribution)) {
          if (key in merged) {
            throw new Error(
              `compose(${name}): state key "${key}" contributed by more than one slice`,
            );
          }
        }
        Object.assign(merged, contribution);
      }
      return merged;
    },
    actions,
    canDispatch: (state, action) =>
      contributors.every((entry) => entry.canDispatch?.(state, action) ?? true),
    aria: (state, config, ids) => {
      const merged: Record<string, AriaAttrs> = {};
      for (const slice of slices) {
        const contribution = slice.aria?.(state, config, ids) ?? {};
        for (const [part, attrs] of Object.entries(contribution)) {
          const target = merged[part] ?? (merged[part] = {});
          for (const [attr, value] of Object.entries(attrs ?? {})) {
            if (attr in target) {
              throw new Error(
                `compose(${name}): aria attribute "${attr}" on part "${part}" set by two slices -- resolve in the glue slice`,
              );
            }
            target[attr] = value;
          }
        }
      }
      const glueContribution = theGlue?.aria?.(state, config, ids) ?? {};
      for (const [part, attrs] of Object.entries(glueContribution)) {
        merged[part] = { ...merged[part], ...attrs };
      }
      return merged;
    },
    keymap: (event, state, part) => {
      const glueClaim = theGlue?.keymap?.(event, state, part) ?? null;
      if (glueClaim !== null) return glueClaim;
      const claims = slices
        .map((slice) => ({ slice, action: slice.keymap?.(event, state, part) ?? null }))
        .filter((claim) => claim.action !== null);
      if (claims.length > 1) {
        throw new Error(
          `compose(${name}): key "${event.key}" on part "${part}" claimed by ${claims
            .map((c) => `"${c.slice.name}"`)
            .join(' and ')} -- resolve in the glue slice`,
        );
      }
      return claims[0]?.action ?? null;
    },
    effects: (state, config) =>
      contributors.flatMap((entry) => entry.effects?.(state, config) ?? []),
  };
}
