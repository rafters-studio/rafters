import { describe, expect, it } from 'vitest';
import { separator } from '../../../src/components/separator/separator.behavior';
import type { AriaRole } from '../../../src/lib/contract';

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

  // The projected role is typed AriaRole, not a bare string (#2002). HONEST
  // LIMIT: the annotation below documents intent but is NOT compile-enforced --
  // tsconfig excludes test files and vitest runs without typechecking, so a
  // type regression would not fail here. The runtime value assertion is what
  // this test actually guards; the type is guarded only by astro check over
  // the .astro consumers, which no automated path currently runs (see #2008's
  // audit note -- the dogfood consumer install is the real tripwire today).
  it('projects role as an AriaRole, so performances paint it without casting', () => {
    const decorativeRole: AriaRole | undefined = separator.aria(state, {}, ids).root?.role;
    const semanticRole: AriaRole | undefined = separator.aria(state, { decorative: false }, ids)
      .root?.role;
    expect(decorativeRole).toBe('none');
    expect(semanticRole).toBe('separator');
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

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(separator.initialState({})).toEqual({});
  });
});
