import { describe, expect, it } from 'vitest';
import { compose, type GlueSlice, type Slice } from '../../src/lib/compose';

interface Config {
  label: string;
}

type AlphaState = { alpha: number };
type AlphaActions = { bump: undefined };
const alpha: Slice<Config, AlphaState, AlphaActions, 'root' | 'panel'> = {
  name: 'alpha',
  parts: { root: {}, panel: { optional: true } },
  initialState: () => ({ alpha: 0 }),
  actions: { bump: (state) => ({ ...state, alpha: state.alpha + 1 }) },
  canDispatch: (state, _action, _config) => state.alpha < 3,
  aria: (state) => ({ root: { 'data-alpha': String(state.alpha) } }),
  keymap: (event, _state, part) => (part === 'root' && event.key === 'a' ? 'bump' : null),
  effects: (_state, config) => [
    { type: 'announce', message: `alpha:${config.label}`, politeness: 'polite' },
  ],
};

type BetaState = { beta: boolean };
type BetaActions = { flip: undefined };
const beta: Slice<Config, BetaState, BetaActions, 'root' | 'panel'> = {
  name: 'beta',
  parts: { root: {} },
  initialState: () => ({ beta: false }),
  actions: { flip: (state) => ({ ...state, beta: !state.beta }) },
  aria: (state) => ({ panel: { 'data-beta': state.beta ? 'true' : 'false' } }),
  keymap: (event, _state, part) => (part === 'panel' && event.key === 'b' ? 'flip' : null),
};

describe('compose merge rules', () => {
  it('merges state, actions, parts, aria, and effects across slices', () => {
    const spec = compose('ab', alpha, beta);
    const state = spec.initialState({ label: 'x' });
    expect(state).toEqual({ alpha: 0, beta: false });
    expect(Object.keys(spec.actions).sort()).toEqual(['bump', 'flip']);
    expect(Object.keys(spec.parts).sort()).toEqual(['panel', 'root']);
    expect(spec.aria(state, { label: 'x' }, { root: 'r', panel: 'p' })).toEqual({
      root: { 'data-alpha': '0' },
      panel: { 'data-beta': 'false' },
    });
    expect(spec.effects(state, { label: 'x' })).toEqual([
      { type: 'announce', message: 'alpha:x', politeness: 'polite' },
    ]);
  });

  it('canDispatch is the AND of all contributors', () => {
    const spec = compose('ab', alpha, beta);
    expect(spec.canDispatch({ alpha: 0, beta: false }, 'flip', { label: 'x' })).toBe(true);
    expect(spec.canDispatch({ alpha: 3, beta: false }, 'flip', { label: 'x' })).toBe(false);
  });

  it('keymap routes to the single claiming slice per part', () => {
    const spec = compose('ab', alpha, beta);
    const state = { alpha: 0, beta: false };
    expect(spec.keymap({ key: 'a' }, state, 'root')).toBe('bump');
    expect(spec.keymap({ key: 'b' }, state, 'panel')).toBe('flip');
    expect(spec.keymap({ key: 'b' }, state, 'root')).toBeNull();
  });

  it('throws on a state key collision', () => {
    const alphaClone: Slice<Config, AlphaState, { other: undefined }, 'root'> = {
      name: 'alpha-clone',
      initialState: () => ({ alpha: 9 }),
      actions: { other: (state) => state },
    };
    const spec = compose(
      'collide',
      alpha,
      alphaClone as unknown as Slice<Config, BetaState, BetaActions, 'root' | 'panel'>,
    );
    expect(() => spec.initialState({ label: 'x' })).toThrow(/state key "alpha"/);
  });

  it('throws when two slices define the same action', () => {
    const bumpAgain: Slice<Config, BetaState, AlphaActions, 'root'> = {
      name: 'bump-again',
      initialState: () => ({ beta: true }),
      actions: { bump: (state) => state },
    };
    expect(() =>
      compose(
        'dup',
        alpha,
        bumpAgain as unknown as Slice<Config, BetaState, BetaActions, 'root' | 'panel'>,
      ),
    ).toThrow(/action "bump"/);
  });

  it('throws when two slices claim the same key on the same part', () => {
    const rival: Slice<Config, BetaState, BetaActions, 'root' | 'panel'> = {
      ...beta,
      name: 'rival',
      keymap: (event, _state, part) => (part === 'root' && event.key === 'a' ? 'flip' : null),
    };
    const spec = compose('contested', alpha, rival);
    expect(() => spec.keymap({ key: 'a' }, { alpha: 0, beta: false }, 'root')).toThrow(
      /claimed by "alpha" and "rival"/,
    );
  });

  it('throws when two slices set the same aria attribute on the same part', () => {
    const rival: Slice<Config, BetaState, BetaActions, 'root' | 'panel'> = {
      ...beta,
      name: 'rival',
      aria: () => ({ root: { 'data-alpha': 'stolen' } }),
    };
    const spec = compose('aria-collision', alpha, rival);
    expect(() =>
      spec.aria({ alpha: 0, beta: false }, { label: 'x' }, { root: 'r', panel: 'p' }),
    ).toThrow(/aria attribute "data-alpha"/);
  });

  it('the glue slice resolves contested keys and overrides aria', () => {
    const rival: Slice<Config, BetaState, BetaActions, 'root' | 'panel'> = {
      ...beta,
      name: 'rival',
      keymap: (event, _state, part) => (part === 'root' && event.key === 'a' ? 'flip' : null),
    };
    const glue: GlueSlice<
      Config,
      AlphaState & BetaState,
      Record<string, never>,
      'root' | 'panel'
    > = {
      kind: 'glue',
      name: 'ab-glue',
      keymap: (event, state, part) =>
        part === 'root' && event.key === 'a' ? (state.beta ? 'flip' : 'bump') : null,
      aria: (state) => ({ root: { 'data-alpha': `glued:${state.alpha}` } }),
    };
    const spec = compose('glued', alpha, rival, glue);
    expect(spec.keymap({ key: 'a' }, { alpha: 1, beta: false }, 'root')).toBe('bump');
    expect(spec.keymap({ key: 'a' }, { alpha: 1, beta: true }, 'root')).toBe('flip');
    expect(
      spec.aria({ alpha: 1, beta: false }, { label: 'x' }, { root: 'r', panel: 'p' }).root,
    ).toEqual({ 'data-alpha': 'glued:1' });
  });

  it('rejects a glue slice that is not last, and more than one glue', () => {
    const glue: GlueSlice<Config, AlphaState, Record<string, never>, 'root' | 'panel'> = {
      kind: 'glue',
      name: 'g',
    };
    expect(() => compose('misplaced', glue as never, alpha as never)).toThrow(
      /glue slice must be last/,
    );
    expect(() => compose('twice', alpha as never, glue as never, glue as never)).toThrow(
      /at most one glue/,
    );
  });

  it('throws when a part is redeclared with a different PartDecl', () => {
    const rival: Slice<Config, BetaState, BetaActions, 'root' | 'panel'> = {
      ...beta,
      name: 'rival',
      parts: { panel: { optional: false } },
    };
    expect(() => compose('parts', alpha, rival)).toThrow(/part "panel"/);
  });
});
