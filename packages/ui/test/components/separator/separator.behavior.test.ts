import { describe, expect, it } from 'vitest';
import { separator } from '../../../src/components/separator/separator.behavior';

const state = {};
const ids = { root: 'r' };

describe('separator parts', () => {
  it('declares a single root part -- the rule is the only contract', () => {
    expect(Object.keys(separator.parts)).toEqual(['root']);
  });

  it('projects no fixed role on the part decl -- role varies with config', () => {
    expect(separator.parts.root.role).toBeUndefined();
  });
});

describe('separator aria projection', () => {
  it('is decorative by default: role="none", no aria-orientation announced', () => {
    expect(separator.aria(state, {}, ids).root).toEqual({ role: 'none' });
  });

  it('stays decorative for any orientation when decorative is unset', () => {
    expect(separator.aria(state, { orientation: 'vertical' }, ids).root).toEqual({ role: 'none' });
  });

  it('becomes a semantic separator carrying aria-orientation when opted out', () => {
    expect(separator.aria(state, { decorative: false }, ids).root).toEqual({
      role: 'separator',
      'aria-orientation': 'horizontal',
    });
    expect(separator.aria(state, { decorative: false, orientation: 'vertical' }, ids).root).toEqual(
      {
        role: 'separator',
        'aria-orientation': 'vertical',
      },
    );
  });

  it('decorative=true is explicit-equivalent to the default', () => {
    expect(separator.aria(state, { decorative: true, orientation: 'vertical' }, ids).root).toEqual({
      role: 'none',
    });
  });
});

describe('separator is a static score -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(separator.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(separator.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys -- a rule has no keyboard contract', () => {
    expect(separator.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(separator.keymap({ key: 'ArrowRight' }, state, 'root', {})).toBeNull();
  });

  it('has no effects -- nothing to perform, so nothing to bind', () => {
    expect(separator.effects(state, {})).toEqual([]);
    expect(separator.effects(state, { decorative: false })).toEqual([]);
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(separator.initialState({})).toEqual({});
  });
});
