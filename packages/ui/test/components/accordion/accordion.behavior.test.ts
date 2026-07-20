/**
 * Pure behavior test for the accordion score: reducers, gates, and the
 * aria/instanceAria/keymap projections. No DOM, no framework -- this is the
 * score alone, the same one all three performances drive.
 */
import { describe, expect, it } from 'vitest';
import {
  accordion,
  accordionInstanceAria,
  emitValue,
  expandedValues,
  isItemExpanded,
  isMultiple,
  headingLevelOf,
  type AccordionConfig,
  type AccordionState,
} from '../../../src/components/accordion/accordion.behavior';

const base: AccordionConfig = {};

function stateFor(config: AccordionConfig): AccordionState {
  return accordion.initialState(config);
}

function toggle(state: AccordionState, value: string): AccordionState {
  return accordion.actions.toggle(state, value);
}

describe('accordion initial state', () => {
  it('single mode seeds at most one value and is non-collapsible by default', () => {
    const state = stateFor({ defaultValue: ['a', 'b'] });
    expect(state.value).toEqual(['a']);
    expect(state.multiple).toBe(false);
    expect(state.collapsible).toBe(false);
  });

  it('multiple mode seeds the whole set and is inherently collapsible', () => {
    const state = stateFor({ type: 'multiple', defaultValue: ['a', 'b'] });
    expect(state.value).toEqual(['a', 'b']);
    expect(state.multiple).toBe(true);
    expect(state.collapsible).toBe(true);
  });

  it('a controlled value seeds the intrinsic set too, so first paint matches', () => {
    expect(stateFor({ value: 'b' }).value).toEqual(['b']);
  });

  it('an empty string is absence, not a value', () => {
    expect(stateFor({ defaultValue: '' }).value).toEqual([]);
    expect(stateFor({ type: 'multiple', defaultValue: ['a', ''] }).value).toEqual(['a']);
  });
});

describe('accordion toggle reducer', () => {
  it('single: opening a section replaces the open one', () => {
    const opened = toggle(stateFor({ defaultValue: 'a' }), 'b');
    expect(opened.value).toEqual(['b']);
  });

  it('single non-collapsible: re-activating the open section is a no-op', () => {
    const state = stateFor({ defaultValue: 'a' });
    const next = toggle(state, 'a');
    expect(next.value).toEqual(['a']);
    // Identity matters: the decorators compare before/after to decide whether
    // the consumer callback fires, so a refused edit must not look like a move.
    expect(next).toBe(state);
  });

  it('single collapsible: re-activating the open section closes everything', () => {
    const state = stateFor({ defaultValue: 'a', collapsible: true });
    expect(toggle(state, 'a').value).toEqual([]);
  });

  it('multiple: sections accumulate and toggle out independently', () => {
    let state = stateFor({ type: 'multiple' });
    state = toggle(state, 'a');
    state = toggle(state, 'b');
    expect(state.value).toEqual(['a', 'b']);
    state = toggle(state, 'a');
    expect(state.value).toEqual(['b']);
  });

  it('an empty payload never moves state', () => {
    const state = stateFor({ type: 'multiple', defaultValue: 'a' });
    expect(toggle(state, '')).toBe(state);
  });
});

describe('accordion gates', () => {
  it('a disabled accordion rejects toggling', () => {
    const state = stateFor({ disabled: true });
    expect(accordion.canDispatch(state, 'toggle', { disabled: true })).toBe(false);
    expect(accordion.canDispatch(state, 'toggle', {})).toBe(true);
  });
});

describe('accordion effective value', () => {
  it('a controlled value shadows the intrinsic set', () => {
    const state: AccordionState = { value: ['a'], multiple: false, collapsible: false };
    expect(expandedValues(state, { value: 'b' })).toEqual(['b']);
    expect(expandedValues(state, {})).toEqual(['a']);
  });

  it('a controlled single value is clamped to one entry', () => {
    const state = stateFor(base);
    expect(expandedValues(state, { value: ['a', 'b'] })).toEqual(['a']);
    expect(expandedValues(state, { type: 'multiple', value: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('isItemExpanded reads the effective set', () => {
    const state = stateFor({ defaultValue: 'a' });
    expect(isItemExpanded('a', state, base)).toBe(true);
    expect(isItemExpanded('a', state, { value: 'b' })).toBe(false);
  });

  it('emitValue reports a string for single and an array for multiple', () => {
    expect(emitValue(['a'], base)).toBe('a');
    expect(emitValue([], base)).toBe('');
    expect(emitValue(['a', 'b'], { type: 'multiple' })).toEqual(['a', 'b']);
  });

  it('isMultiple and headingLevelOf read the config defaults', () => {
    expect(isMultiple(base)).toBe(false);
    expect(isMultiple({ type: 'multiple' })).toBe(true);
    expect(headingLevelOf(base)).toBe(3);
    expect(headingLevelOf({ headingLevel: 2 })).toBe(2);
  });
});

describe('accordion root projection', () => {
  it('advertises the vertical axis, the mode, and the heading level', () => {
    const config: AccordionConfig = { type: 'multiple', headingLevel: 2 };
    const root = accordion.aria(stateFor(config), config, {
      root: '',
      item: '',
      heading: '',
      trigger: '',
      content: '',
    }).root;
    expect(root?.['data-orientation']).toBe('vertical');
    expect(root?.['data-type']).toBe('multiple');
    expect(root?.['data-collapsible']).toBe('true');
    expect(root?.['data-heading-level']).toBe('2');
    expect(root?.['data-disabled']).toBeUndefined();
  });

  it('projects data-disabled only when the accordion is disabled', () => {
    const config: AccordionConfig = { disabled: true };
    const ids = { root: '', item: '', heading: '', trigger: '', content: '' };
    expect(accordion.aria(stateFor(config), config, ids).root?.['data-disabled']).toBe('true');
  });
});

describe('accordion instance projection', () => {
  const config: AccordionConfig = {};
  const state = stateFor({ defaultValue: 'a' });
  const ids = { trigger: 't-a', content: 'c-a' };

  it('the trigger carries aria-expanded, aria-controls, and data-state', () => {
    const open = accordionInstanceAria('trigger', 'a', state, config, ids);
    expect(open['aria-expanded']).toBe('true');
    expect(open['aria-controls']).toBe('c-a');
    expect(open['data-state']).toBe('open');

    const closed = accordionInstanceAria('trigger', 'b', state, config, {
      trigger: 't-b',
      content: 'c-b',
    });
    expect(closed['aria-expanded']).toBe('false');
    expect(closed['data-state']).toBe('closed');
  });

  it('aria-controls is projected while collapsed too -- the panel never unmounts', () => {
    const closed = accordionInstanceAria('trigger', 'b', state, config, {
      trigger: 't-b',
      content: 'c-b',
    });
    expect(closed['aria-controls']).toBe('c-b');
  });

  it('an unresolved sibling id projects absence rather than an empty reference', () => {
    const orphan = accordionInstanceAria('trigger', 'b', state, config, {});
    expect(orphan['aria-controls']).toBeUndefined();
  });

  it('the panel is a region named by its trigger, hidden while collapsed', () => {
    const open = accordionInstanceAria('content', 'a', state, config, ids);
    expect(open['role']).toBe('region');
    expect(open['aria-labelledby']).toBe('t-a');
    expect(open['hidden']).toBeUndefined();

    const closed = accordionInstanceAria('content', 'b', state, config, {
      trigger: 't-b',
      content: 'c-b',
    });
    expect(closed['hidden']).toBe(true);
  });

  it('the heading wrapper carries role and the configured level', () => {
    expect(accordionInstanceAria('heading', 'a', state, config, {})).toEqual({
      role: 'heading',
      'aria-level': '3',
    });
    expect(
      accordionInstanceAria('heading', 'a', state, { headingLevel: 2 }, {})['aria-level'],
    ).toBe('2');
  });

  it('the item wrapper mirrors data-state for styling', () => {
    expect(accordionInstanceAria('item', 'a', state, config, {})['data-state']).toBe('open');
    expect(accordionInstanceAria('item', 'b', state, config, {})['data-state']).toBe('closed');
  });

  it('the root has no per-instance projection', () => {
    expect(accordionInstanceAria('root', 'a', state, config, {})).toEqual({});
  });
});

describe('accordion keymap', () => {
  const state = stateFor(base);

  it('Enter and Space on a trigger map to toggle', () => {
    expect(accordion.keymap({ key: 'Enter' }, state, 'trigger', base)).toBe('toggle');
    expect(accordion.keymap({ key: ' ' }, state, 'trigger', base)).toBe('toggle');
  });

  it('arrow and Home/End keys are NOT claimed -- roving-focus owns movement', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
      expect(accordion.keymap({ key }, state, 'trigger', base)).toBeNull();
    }
  });

  it('activation keys on other parts are not claimed', () => {
    expect(accordion.keymap({ key: 'Enter' }, state, 'content', base)).toBeNull();
    expect(accordion.keymap({ key: 'Enter' }, state, 'root', base)).toBeNull();
  });
});

describe('accordion parts', () => {
  it('declares the section parts as many, with the pattern roles', () => {
    expect(accordion.parts.root.many).toBeUndefined();
    for (const part of ['item', 'heading', 'trigger', 'content'] as const) {
      expect(accordion.parts[part].many, `${part} is a many part`).toBe(true);
    }
    expect(accordion.parts.heading.role).toBe('heading');
    expect(accordion.parts.content.role).toBe('region');
  });
});
