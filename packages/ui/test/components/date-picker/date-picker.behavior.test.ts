/**
 * The date-picker score, pure: popover's axis folded with the committed value
 * and the glue that closes a complete selection. No DOM.
 */
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import { popover } from '../../../src/components/popover/popover.behavior';
import {
  calendarKey,
  calendarSelected,
  controlledSelection,
  datePicker,
  datePickerIds,
  effectiveValue,
  formatValue,
  fromSelection,
  isComplete,
  isEmpty,
  isOpen,
  nextSelection,
  parseSelection,
  selectionProp,
  serializeValue,
  toSelection,
  type DatePickerConfig,
} from '../../../src/components/date-picker/date-picker.behavior';

const single = (overrides: Partial<DatePickerConfig> = {}): DatePickerConfig => ({
  mode: 'single',
  ...overrides,
});
const range = (overrides: Partial<DatePickerConfig> = {}): DatePickerConfig => ({
  mode: 'range',
  ...overrides,
});

const ids = { trigger: 't', content: 'c', anchor: '', close: '', value: 'v' };

describe('date-picker score: composition', () => {
  it('folds popover whole: every popover part is a picker part, plus the value label', () => {
    for (const part of Object.keys(popover.parts)) {
      expect(datePicker.parts).toHaveProperty(part);
    }
    expect(Object.keys(datePicker.parts).sort()).toEqual(
      ['anchor', 'close', 'content', 'trigger', 'value'].sort(),
    );
  });

  it('initial state: closed, empty value for the mode', () => {
    expect(datePicker.initialState(single())).toEqual({
      open: false,
      value: { mode: 'single', date: null },
    });
    expect(datePicker.initialState(range())).toEqual({
      open: false,
      value: { mode: 'range', from: null, to: null },
    });
  });

  it('seeds the value from defaultValue and the open axis from defaultOpen', () => {
    const state = datePicker.initialState(
      single({ defaultValue: { mode: 'single', date: '2026-07-08' }, defaultOpen: true }),
    );
    expect(state).toEqual({ open: true, value: { mode: 'single', date: '2026-07-08' } });
  });
});

describe('date-picker part ids', () => {
  it('derives the rendered parts from one base; unrendered popover parts are empty', () => {
    expect(datePickerIds('dp')).toEqual({
      trigger: 'dp-trigger',
      content: 'dp-content',
      value: 'dp-value',
      anchor: '',
      close: '',
    });
  });
});

describe('date-picker score: aria', () => {
  it('closed: popover identity on the trigger, dialog named by the trigger, empty label', () => {
    const config = single();
    const aria = datePicker.aria(datePicker.initialState(config), config, ids);
    expect(aria.trigger).toMatchObject({
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'data-state': 'closed',
      'data-disabled': undefined,
    });
    expect(aria.content).toMatchObject({
      role: 'dialog',
      'aria-labelledby': 't',
      'data-state': 'closed',
    });
    expect(aria.value).toEqual({ 'data-empty': '' });
  });

  it('open: aria-controls references the content; a value drops data-empty', () => {
    const config = single({
      defaultOpen: true,
      defaultValue: { mode: 'single', date: '2026-07-08' },
    });
    const aria = datePicker.aria(datePicker.initialState(config), config, ids);
    expect(aria.trigger?.['aria-controls']).toBe('c');
    expect(aria.trigger?.['aria-expanded']).toBe('true');
    expect(aria.value).toEqual({ 'data-empty': undefined });
  });

  it('an empty trigger id leaves the dialog unnamed rather than dangling', () => {
    const config = single();
    const aria = datePicker.aria(datePicker.initialState(config), config, { ...ids, trigger: '' });
    expect(aria.content?.['aria-labelledby']).toBeUndefined();
  });

  it('disabled projects data-disabled on the trigger', () => {
    const config = single({ disabled: true });
    const aria = datePicker.aria(datePicker.initialState(config), config, ids);
    expect(aria.trigger?.['data-disabled']).toBe('');
  });
});

describe('date-picker score: keymap', () => {
  it('Escape on the content closes; nothing else is claimed', () => {
    const config = single({ defaultOpen: true });
    const state = datePicker.initialState(config);
    expect(datePicker.keymap({ key: 'Escape' }, state, 'content', config)).toBe('close');
    expect(datePicker.keymap({ key: 'Escape' }, state, 'trigger', config)).toBeNull();
    expect(datePicker.keymap({ key: 'Enter' }, state, 'content', config)).toBeNull();
  });
});

describe('date-picker score: commit (the glue)', () => {
  it('single: committing a date sets the value and closes the popup', () => {
    const config = single({ defaultOpen: true });
    const { memory, dispatch } = createBehavior(datePicker, config);
    const selection = nextSelection(effectiveValue(memory.get(), config), '2026-07-08');
    expect(dispatch('commit', config, { selection })).toBe(true);
    expect(memory.get()).toEqual({ open: false, value: { mode: 'single', date: '2026-07-08' } });
  });

  it('range: the first click keeps the popup open, the second closes it ordered', () => {
    const config = range({ defaultOpen: true });
    const { memory, dispatch } = createBehavior(datePicker, config);
    const first = nextSelection(effectiveValue(memory.get(), config), '2026-07-20');
    dispatch('commit', config, { selection: first });
    expect(isOpen(memory.get(), config)).toBe(true);
    expect(memory.get().value).toEqual({ mode: 'range', from: '2026-07-20', to: null });
    const second = nextSelection(effectiveValue(memory.get(), config), '2026-07-10');
    dispatch('commit', config, { selection: second });
    expect(isOpen(memory.get(), config)).toBe(false);
    expect(memory.get().value).toEqual({ mode: 'range', from: '2026-07-10', to: '2026-07-20' });
  });

  it('a same-value commit keeps the value reference', () => {
    const config = single({ defaultValue: { mode: 'single', date: '2026-07-08' } });
    const { memory, dispatch } = createBehavior(datePicker, config);
    const before = memory.get().value;
    dispatch('commit', config, { selection: { mode: 'single', date: '2026-07-08' } });
    expect(memory.get().value).toBe(before);
  });

  it('a controlled value shadows the intrinsic value', () => {
    const config = single({ value: { mode: 'single', date: '2026-01-01' } });
    const { memory, dispatch } = createBehavior(datePicker, config);
    dispatch('commit', config, { selection: { mode: 'single', date: '2026-07-08' } });
    expect(effectiveValue(memory.get(), config)).toEqual({ mode: 'single', date: '2026-01-01' });
    expect(memory.get().value).toEqual({ mode: 'single', date: '2026-07-08' });
  });
});

describe('date-picker score: canDispatch', () => {
  it('disabled refuses open and commit, but still allows close', () => {
    const config = single({ disabled: true });
    const state = { ...datePicker.initialState(config), open: true };
    expect(datePicker.canDispatch(datePicker.initialState(config), 'open', config)).toBe(false);
    expect(datePicker.canDispatch(state, 'commit', config)).toBe(false);
    expect(datePicker.canDispatch(state, 'close', config)).toBe(true);
  });

  it('keeps popover idempotence: open refused while open, close refused while closed', () => {
    const config = single();
    const closed = datePicker.initialState(config);
    expect(datePicker.canDispatch(closed, 'close', config)).toBe(false);
    expect(datePicker.canDispatch({ ...closed, open: true }, 'open', config)).toBe(false);
  });
});

describe('date-picker value helpers', () => {
  it('isComplete / isEmpty per mode', () => {
    expect(isComplete({ mode: 'single', date: null })).toBe(false);
    expect(isComplete({ mode: 'single', date: '2026-07-08' })).toBe(true);
    expect(isComplete({ mode: 'range', from: '2026-07-08', to: null })).toBe(false);
    expect(isComplete({ mode: 'range', from: '2026-07-08', to: '2026-07-09' })).toBe(true);
    expect(isEmpty({ mode: 'range', from: null, to: null })).toBe(true);
    expect(isEmpty({ mode: 'range', from: '2026-07-08', to: null })).toBe(false);
  });

  it('formatValue uses the oracle format, a range joins with " - "', () => {
    expect(formatValue({ mode: 'single', date: null })).toBe('');
    expect(formatValue({ mode: 'single', date: '2026-07-08' })).toBe('Jul 8, 2026');
    expect(formatValue({ mode: 'range', from: '2026-07-08', to: null })).toBe('Jul 8, 2026');
    expect(formatValue({ mode: 'range', from: '2026-07-08', to: '2026-07-10' })).toBe(
      'Jul 8, 2026 - Jul 10, 2026',
    );
    expect(formatValue({ mode: 'single', date: '2026-07-08' }, (d) => String(d.getDate()))).toBe(
      '8',
    );
  });

  it('serializeValue round-trips through calendar parseSelection', () => {
    const cases = [
      { mode: 'single', date: '2026-07-08' },
      { mode: 'range', from: '2026-07-08', to: '2026-07-10' },
      { mode: 'range', from: '2026-07-08', to: null },
    ] as const;
    for (const selection of cases) {
      const raw = serializeValue(selection);
      expect(parseSelection(selection.mode, raw)).toEqual(selection);
    }
    expect(serializeValue({ mode: 'single', date: null })).toBe('');
    expect(serializeValue({ mode: 'range', from: null, to: null })).toBe('');
  });

  it('toSelection / fromSelection convert the React value shapes', () => {
    const date = new Date(2026, 6, 8);
    expect(toSelection('single', date)).toEqual({ mode: 'single', date: '2026-07-08' });
    expect(toSelection('single', undefined)).toEqual({ mode: 'single', date: null });
    expect(toSelection('range', { from: date, to: undefined })).toEqual({
      mode: 'range',
      from: '2026-07-08',
      to: null,
    });
    expect(fromSelection({ mode: 'single', date: '2026-07-08' })).toEqual(date);
    expect(fromSelection({ mode: 'range', from: null, to: null })).toBeUndefined();
    expect(fromSelection({ mode: 'range', from: '2026-07-08', to: null })).toEqual({
      from: date,
      to: undefined,
    });
    expect(selectionProp('single', undefined)).toBeUndefined();
    expect(selectionProp('single', date)).toEqual({ mode: 'single', date: '2026-07-08' });
  });
});

describe('date-picker React value helpers', () => {
  it('controlledSelection: controlled by the prop key, an explicit undefined is empty', () => {
    expect(controlledSelection('single', {})).toBeUndefined();
    expect(controlledSelection('single', { value: undefined })).toEqual({
      mode: 'single',
      date: null,
    });
    expect(controlledSelection('single', { value: new Date(2026, 6, 8) })).toEqual({
      mode: 'single',
      date: '2026-07-08',
    });
  });

  it('calendarSelected keeps an empty range controlled; calendarKey flips only for an empty single', () => {
    expect(calendarSelected({ mode: 'range', from: null, to: null })).toEqual({
      from: undefined,
      to: undefined,
    });
    expect(calendarSelected({ mode: 'single', date: null })).toBeUndefined();
    expect(calendarKey({ mode: 'single', date: null })).toBe('empty');
    expect(calendarKey({ mode: 'single', date: '2026-07-08' })).toBe('set');
    expect(calendarKey({ mode: 'range', from: null, to: null })).toBe('set');
  });
});
