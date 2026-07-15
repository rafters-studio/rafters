import { describe, expect, it, vi } from 'vitest';
import { createSelect } from './select.controller';

describe('createSelect', () => {
  it('single-select value replaces; selectValue fires onValueChange and closes', () => {
    const onValueChange = vi.fn();
    const c = createSelect({ initialOpen: true, onValueChange });
    c.selectValue('banana');
    expect(c.group.get()).toEqual(['banana']);
    expect(onValueChange).toHaveBeenCalledWith('banana');
    expect(c.cell.get().open).toBe(false);
  });

  it('replaces the previous value (single-select semantics)', () => {
    const c = createSelect({ initialValue: 'apple' });
    expect(c.group.get()).toEqual(['apple']);
    c.selectValue('banana');
    expect(c.group.get()).toEqual(['banana']);
  });

  it('setValue is programmatic (no callback) - controlled-sync path', () => {
    const onValueChange = vi.fn();
    const c2 = createSelect({ onValueChange });
    onValueChange.mockClear();
    c2.setValue('apple');
    expect(c2.group.get()).toEqual(['apple']);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('setOpen(false) clears highlight (ported handleOpenChange reset)', () => {
    const c3 = createSelect({ initialOpen: true });
    c3.setHighlighted('cherry');
    c3.setOpen(false);
    expect(c3.cell.get().highlightedValue).toBeUndefined();
  });

  it('setOpen fires onOpenChange', () => {
    const onOpenChange = vi.fn();
    const c = createSelect({ onOpenChange });
    c.setOpen(true);
    c.setOpen(false);
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('selectValue also fires onOpenChange(false) on close', () => {
    const onOpenChange = vi.fn();
    const c = createSelect({ initialOpen: true, onOpenChange });
    c.selectValue('banana');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('registerLabel bumps labelVersion but does NOT churn open/highlight watchers', () => {
    const c4 = createSelect();
    const openFires: boolean[] = [];
    c4.cell.select(
      (s) => s.open,
      (o) => openFires.push(o),
    );
    c4.registerLabel('a', 'Apple');
    c4.registerLabel('b', 'Banana');
    expect(c4.getLabel('b')).toBe('Banana');
    expect(c4.cell.get().labelVersion).toBe(2);
    expect(openFires).toEqual([]); // label mounts never re-render open consumers
  });

  it('registerLabel is idempotent - no bump when label is unchanged', () => {
    const c = createSelect();
    c.registerLabel('a', 'Apple');
    c.registerLabel('a', 'Apple');
    expect(c.cell.get().labelVersion).toBe(1);
  });

  it('getLabel returns undefined for unregistered values', () => {
    const c = createSelect();
    expect(c.getLabel('missing')).toBeUndefined();
  });

  it('honors initial value and open', () => {
    const c = createSelect({ initialValue: 'apple', initialOpen: true });
    expect(c.group.get()).toEqual(['apple']);
    expect(c.cell.get().open).toBe(true);
  });

  it('destroy is safe to call', () => {
    const c = createSelect();
    expect(() => c.destroy()).not.toThrow();
  });
});
