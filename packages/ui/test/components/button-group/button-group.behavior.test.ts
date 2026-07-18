import { describe, expect, it } from 'vitest';
import {
  buttonGroup,
  isButtonGroupOrientation,
  parseOrientation,
} from '../../../src/components/button-group/button-group.behavior';

const state = {};
const ids = { root: 'r' };

describe('button-group parts', () => {
  it('declares a single root part', () => {
    expect(Object.keys(buttonGroup.parts)).toEqual(['root']);
  });
});

describe('button-group aria projection', () => {
  it('projects role=group unconditionally, independent of orientation', () => {
    expect(buttonGroup.aria(state, { orientation: 'horizontal' }, ids).root?.role).toBe('group');
    expect(buttonGroup.aria(state, { orientation: 'vertical' }, ids).root?.role).toBe('group');
  });

  it('never projects aria-label -- the label is a consumer passthrough', () => {
    const attrs = buttonGroup.aria(state, { orientation: 'horizontal' }, ids).root ?? {};
    expect('aria-label' in attrs).toBe(false);
  });
});

describe('button-group orientation parsing', () => {
  it('accepts the two known orientations', () => {
    expect(isButtonGroupOrientation('horizontal')).toBe(true);
    expect(isButtonGroupOrientation('vertical')).toBe(true);
    expect(isButtonGroupOrientation('diagonal')).toBe(false);
    expect(isButtonGroupOrientation(null)).toBe(false);
  });

  it('silently falls back to horizontal for unknown values (oracle rule)', () => {
    expect(parseOrientation('vertical')).toBe('vertical');
    expect(parseOrientation('sideways')).toBe('horizontal');
    expect(parseOrientation(null)).toBe('horizontal');
    expect(parseOrientation(undefined)).toBe('horizontal');
  });
});

describe('button-group has no dynamic behavior', () => {
  it('has no actions', () => {
    expect(Object.keys(buttonGroup.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(buttonGroup.canDispatch(state, 'anything' as never, { orientation: 'horizontal' })).toBe(
      true,
    );
  });

  it('claims no keys', () => {
    expect(
      buttonGroup.keymap({ key: 'Enter' }, state, 'root', { orientation: 'horizontal' }),
    ).toBeNull();
  });

  it('has no effects', () => {
    expect(buttonGroup.effects(state, { orientation: 'horizontal' })).toEqual([]);
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(buttonGroup.initialState({ orientation: 'horizontal' })).toEqual({});
  });
});
