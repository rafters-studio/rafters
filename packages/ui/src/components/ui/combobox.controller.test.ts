import { describe, expect, it, vi } from 'vitest';
import { createCombobox } from './combobox.controller';

describe('createCombobox', () => {
  it('commits value + sets inputValue to the label + closes on selectOption', () => {
    const c = createCombobox({ initialOpen: true });
    c.registerOption({ value: 'us', label: 'United States' });
    c.selectOption('us');
    expect(c.group.get()).toEqual(['us']);
    expect(c.cell.get().inputValue).toBe('United States');
    expect(c.cell.get().open).toBe(false);
  });

  it('opens the panel and resets activeIndex when typing', () => {
    const c = createCombobox();
    c.setActiveIndex(3);
    c.setInputValue('uni');
    expect(c.cell.get().open).toBe(true);
    expect(c.cell.get().activeIndex).toBe(-1);
  });

  it('filters options by inputValue (filtering lives in the controller)', () => {
    const c = createCombobox();
    c.registerOption({ value: 'us', label: 'United States' });
    c.registerOption({ value: 'uk', label: 'United Kingdom' });
    c.registerOption({ value: 'fr', label: 'France' });
    c.setInputValue('united');
    expect(c.filteredOptions().map((o) => o.value)).toEqual(['us', 'uk']);
  });

  it('bumps optionsVersion on registerOption without churning value watchers', () => {
    const c = createCombobox();
    const valueFires: string[][] = [];
    c.group.subscribe((sel) => valueFires.push(sel));
    c.registerOption({ value: 'a', label: 'A' });
    expect(c.cell.get().optionsVersion).toBe(1);
    expect(valueFires).toEqual([[]]); // only the immediate subscribe fire; no churn
  });

  it('seeds the selected value from initialValue', () => {
    const c = createCombobox({ initialValue: 'us' });
    expect(c.group.get()).toEqual(['us']);
  });

  it('treats a falsy initialValue as no selection', () => {
    const c = createCombobox({ initialValue: '' });
    expect(c.group.get()).toEqual([]);
  });

  it('setValue is programmatic and does not fire onValueChange', () => {
    const onValueChange = vi.fn();
    const c = createCombobox({ onValueChange });
    c.setValue('us');
    expect(c.group.get()).toEqual(['us']);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('selectOption fires onValueChange and onOpenChange(false)', () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    const c = createCombobox({ initialOpen: true, onValueChange, onOpenChange });
    c.registerOption({ value: 'us', label: 'United States' });
    c.selectOption('us');
    expect(onValueChange).toHaveBeenCalledWith('us');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not commit a disabled option', () => {
    const onValueChange = vi.fn();
    const c = createCombobox({ initialOpen: true, onValueChange });
    c.registerOption({ value: 'us', label: 'United States', disabled: true });
    c.selectOption('us');
    expect(c.group.get()).toEqual([]);
    expect(c.cell.get().open).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('setOpen resets activeIndex on open and fires onOpenChange', () => {
    const onOpenChange = vi.fn();
    const c = createCombobox({ onOpenChange });
    c.setActiveIndex(2);
    c.setOpen(true);
    expect(c.cell.get().open).toBe(true);
    expect(c.cell.get().activeIndex).toBe(-1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('does not reset activeIndex when closing', () => {
    const c = createCombobox({ initialOpen: true });
    c.setActiveIndex(2);
    c.setOpen(false);
    expect(c.cell.get().activeIndex).toBe(2);
  });

  it('setInputValue does not re-fire open when already open', () => {
    const onOpenChange = vi.fn();
    const c = createCombobox({ initialOpen: true, onOpenChange });
    c.setInputValue('uni');
    expect(c.cell.get().open).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('returns the full registry when inputValue is empty', () => {
    const c = createCombobox();
    c.registerOption({ value: 'us', label: 'United States' });
    c.registerOption({ value: 'fr', label: 'France' });
    expect(c.filteredOptions().map((o) => o.value)).toEqual(['us', 'fr']);
  });

  it('replaces an existing option on re-register and keeps order', () => {
    const c = createCombobox();
    c.registerOption({ value: 'us', label: 'United States' });
    c.registerOption({ value: 'fr', label: 'France' });
    c.registerOption({ value: 'us', label: 'USA' });
    expect(c.filteredOptions()).toEqual([
      { value: 'us', label: 'USA' },
      { value: 'fr', label: 'France' },
    ]);
    expect(c.cell.get().optionsVersion).toBe(3);
  });

  it('unregisterOption removes an option and bumps the version', () => {
    const c = createCombobox();
    c.registerOption({ value: 'us', label: 'United States' });
    c.unregisterOption('us');
    expect(c.filteredOptions()).toEqual([]);
    expect(c.cell.get().optionsVersion).toBe(2);
  });

  it('reads the live registry label on selectOption', () => {
    const c = createCombobox({ initialOpen: true });
    c.registerOption({ value: 'us', label: 'United States' });
    c.registerOption({ value: 'us', label: 'USA' });
    c.selectOption('us');
    expect(c.cell.get().inputValue).toBe('USA');
  });
});
