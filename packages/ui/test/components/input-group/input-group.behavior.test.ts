/**
 * The input-group score, driven purely -- no DOM. Everything asserted here is a
 * decision the three decorators are forbidden to restate.
 */
import { describe, expect, it } from 'vitest';
import type { PartIds } from '../../../src/lib/contract';
import {
  addonPart,
  inputGroupBehavior,
  isControlDisabled,
  parseAddonPosition,
  parseInputGroupSize,
  type InputGroupConfig,
  type InputGroupPart,
} from '../../../src/components/input-group/input-group.behavior';

const idsOf = (over: Partial<PartIds<InputGroupPart>> = {}): PartIds<InputGroupPart> => ({
  root: '',
  control: 'c',
  addonStart: '',
  addonEnd: '',
  ...over,
});

function ariaAt(config: InputGroupConfig) {
  return inputGroupBehavior.aria({}, config, idsOf());
}

describe('input-group parts', () => {
  it('declares the root, the contained control, and two optional affixes', () => {
    expect(Object.keys(inputGroupBehavior.parts).sort()).toEqual([
      'addonEnd',
      'addonStart',
      'control',
      'root',
    ]);
    expect(inputGroupBehavior.parts.root.optional).toBeUndefined();
    expect(inputGroupBehavior.parts.control.optional).toBeUndefined();
    expect(inputGroupBehavior.parts.addonStart.optional).toBe(true);
    expect(inputGroupBehavior.parts.addonEnd.optional).toBe(true);
  });

  it('puts NO role on the root: a nameless group role would add no meaning', () => {
    expect(inputGroupBehavior.parts.root.role).toBeUndefined();
    expect(ariaAt({}).root?.role).toBeUndefined();
  });
});

describe('input-group is a wrapper, not a value owner', () => {
  it('has no state axis and no dispatchable action', () => {
    expect(inputGroupBehavior.initialState({})).toEqual({});
    expect(Object.keys(inputGroupBehavior.actions)).toEqual([]);
  });

  it('claims no key: the contained control owns every keystroke', () => {
    for (const key of ['a', 'Enter', 'Escape', 'ArrowLeft', 'Backspace', 'Tab']) {
      expect(inputGroupBehavior.keymap({ key }, {}, 'control', {})).toBeNull();
      expect(inputGroupBehavior.keymap({ key }, {}, 'root', {})).toBeNull();
    }
  });
});

describe('input-group validity projection', () => {
  it('omits aria-invalid when valid, so a contained control keeps its own authority', () => {
    const aria = ariaAt({});
    expect(aria.control?.['aria-invalid']).toBeUndefined();
    expect(aria.control?.['data-state']).toBe('default');
  });

  it('projects aria-invalid onto the CONTROL, where assistive tech expects it', () => {
    const aria = ariaAt({ invalid: true });
    expect(aria.control?.['aria-invalid']).toBe('true');
    expect(aria.control?.['data-state']).toBe('invalid');
  });

  it('reflects validity on the root too, because the root draws the border', () => {
    expect(ariaAt({ invalid: true }).root?.['data-state']).toBe('invalid');
    expect(ariaAt({ invalid: false }).root?.['data-state']).toBe('default');
  });

  it('never puts aria-invalid on the root: the wrapper is not the field', () => {
    expect(ariaAt({ invalid: true }).root?.['aria-invalid']).toBeUndefined();
  });
});

describe('input-group affix positions', () => {
  it('projects the side each affix sits on, so all three decorators agree', () => {
    const aria = ariaAt({});
    expect(aria.addonStart?.['data-position']).toBe('start');
    expect(aria.addonEnd?.['data-position']).toBe('end');
  });

  it('maps a position to its part name', () => {
    expect(addonPart('start')).toBe('addonStart');
    expect(addonPart('end')).toBe('addonEnd');
  });

  it('carries no aria-hidden: an affix may hold a focusable action button', () => {
    const aria = ariaAt({});
    expect(aria.addonStart?.['aria-hidden']).toBeUndefined();
    expect(aria.addonEnd?.['aria-hidden']).toBeUndefined();
  });
});

describe('input-group disabled rule', () => {
  it('a disabled group disables the control', () => {
    expect(isControlDisabled({ disabled: true }, false)).toBe(true);
  });

  it('an enabled group NEVER re-enables an individually disabled control', () => {
    // The oracle assigned `child.disabled = disabled` unconditionally, which
    // silently re-enabled the control here. The OR is the correction.
    expect(isControlDisabled({ disabled: false }, true)).toBe(true);
    expect(isControlDisabled({}, true)).toBe(true);
  });

  it('an enabled group leaves an enabled control alone', () => {
    expect(isControlDisabled({ disabled: false }, false)).toBe(false);
    expect(isControlDisabled({}, false)).toBe(false);
  });
});

describe('input-group attribute parsing (unknown values fall back, the oracle rule)', () => {
  it('parses the size vocabulary', () => {
    expect(parseInputGroupSize('sm')).toBe('sm');
    expect(parseInputGroupSize('lg')).toBe('lg');
    expect(parseInputGroupSize('default')).toBe('default');
  });

  it('falls back to default for an unknown, empty, or missing size', () => {
    expect(parseInputGroupSize('enormous')).toBe('default');
    expect(parseInputGroupSize('')).toBe('default');
    expect(parseInputGroupSize(null)).toBe('default');
    expect(parseInputGroupSize(undefined)).toBe('default');
  });

  it('parses the position vocabulary and falls back to start', () => {
    expect(parseAddonPosition('start')).toBe('start');
    expect(parseAddonPosition('end')).toBe('end');
    expect(parseAddonPosition('middle')).toBe('start');
    expect(parseAddonPosition(null)).toBe('start');
  });
});
