import { describe, expect, it } from 'vitest';
import { createDisclosure } from './disclosure';

describe('createDisclosure', () => {
  it('subscribe fires immediately, then on change; stops after unsubscribe', () => {
    const d = createDisclosure({ initialOpen: false });
    const seen: boolean[] = [];
    const stop = d.subscribe((o) => seen.push(o));
    d.open();
    d.close();
    stop();
    d.open(); // after unsubscribe -> not observed
    expect(seen).toEqual([false, true, false]);
  });

  it('toggle reads the live cell', () => {
    const t = createDisclosure();
    t.toggle();
    expect(t.isOpen()).toBe(true);
    t.toggle();
    expect(t.isOpen()).toBe(false);
  });

  it('open and close set the cell explicitly', () => {
    const d = createDisclosure();
    d.open();
    expect(d.isOpen()).toBe(true);
    d.close();
    expect(d.isOpen()).toBe(false);
  });

  it('setOpen reflects without a callback (controlled-sync path)', () => {
    const c = createDisclosure({ initialOpen: false });
    c.setOpen(true);
    expect(c.isOpen()).toBe(true);
    c.setOpen(false);
    expect(c.isOpen()).toBe(false);
  });

  it('defaults initialOpen to false', () => {
    expect(createDisclosure().isOpen()).toBe(false);
    expect(createDisclosure({ initialOpen: true }).isOpen()).toBe(true);
  });

  it('reset returns to a fresh initial', () => {
    const r = createDisclosure({ initialOpen: false });
    r.open();
    r.memory.reset();
    expect(r.isOpen()).toBe(false);

    const r2 = createDisclosure({ initialOpen: true });
    r2.close();
    r2.memory.reset();
    expect(r2.isOpen()).toBe(true);
  });

  it('select on the memory is equality-gated (no fire on unrelated patch)', () => {
    const e = createDisclosure();
    const fires: boolean[] = [];
    e.memory.select(
      (s) => s.open,
      (o) => fires.push(o),
    );
    e.open();
    e.open();
    expect(fires).toEqual([true]);
  });
});
