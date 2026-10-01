/**
 * command's items / enter row, measured in a real browser (#2414). The list --
 * the item collection's container -- selects `stagger-items`
 * (command.classes.ts); this renders the real React palette with thirteen
 * items, injects the REAL compiled command sheet (the Tailwind CLI, via the
 * componentSheet browser command), and reads each item's computed
 * `animation-delay`.
 *
 * The nonzero step is set on the list by a stylesheet, the way a designer's
 * retune would arrive. No script assigns, reads or computes an index: the
 * ladder is the CSS the exporter wrote.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { Command, CommandItem, CommandList } from '../../../src/components/command/command';

const ITEM_COUNT = 13;
const labels = Array.from({ length: ITEM_COUNT }, (_, index) => `Item ${index + 1}`);

let sheet = '';
const injected: HTMLStyleElement[] = [];

const inject = (css: string): void => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  injected.push(style);
};

beforeAll(async () => {
  sheet = await commands.componentSheet('command');
}, 120_000);

afterEach(() => {
  cleanup();
  for (const style of injected.splice(0)) style.remove();
  document.body.replaceChildren();
});

function renderPalette(): HTMLElement {
  render(
    <Command label="Commands">
      <CommandList>
        {labels.map((label) => (
          <CommandItem key={label} value={label}>
            {label}
          </CommandItem>
        ))}
      </CommandList>
    </Command>,
  );
  const list = document.querySelector<HTMLElement>('[data-part="list"]');
  if (!list) throw new Error('list did not render');
  // :nth-child counts every child, so a stray wrapper would shift positions.
  expect(list.children).toHaveLength(ITEM_COUNT);
  return list;
}

/** Chromium serializes a computed time as seconds ("0.01s"); read it as ms. */
const delayMs = (element: Element): number => {
  const value = getComputedStyle(element).animationDelay;
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value);
  if (!match) throw new Error(`unparseable animation-delay "${value}"`);
  const amount = Number(match[1]);
  return match[2] === 's' ? amount * 1000 : amount;
};

const itemDelays = (list: HTMLElement): number[] =>
  Array.from(list.children, (item) => delayMs(item));

describe('command items / enter: the stagger-items ladder (#2414)', () => {
  it('at the default step the items carry no delay, entering with the list', () => {
    inject(sheet);
    const list = renderPalette();
    expect(itemDelays(list)).toEqual(Array.from({ length: ITEM_COUNT }, () => 0));
  });

  it('with a nonzero step each position waits longer, and item 13 holds at item 12', () => {
    inject(sheet);
    inject('[data-part="list"] { --rafters-delay-stagger-step: 10ms; }');
    const list = renderPalette();
    const delays = itemDelays(list);
    for (let position = 1; position < 12; position++) {
      expect(delays[position], `item ${position + 1} after item ${position}`).toBeGreaterThan(
        delays[position - 1] ?? Number.POSITIVE_INFINITY,
      );
    }
    expect(delays[0]).toBeGreaterThan(0);
    expect(delays[12]).toBe(delays[11]);
  });

  it('the highlight colour change is never delayed by the step', () => {
    inject(sheet);
    // delay-stagger-step compiles to var(--transition-delay-stagger-step), a
    // theme alias resolved at :root, so the step must be set on :root for a
    // delayed item transition to be observable at all.
    inject(':root { --rafters-delay-stagger-step: 10ms; }');
    const list = renderPalette();
    for (const item of Array.from(list.children)) {
      const delays = getComputedStyle(item).transitionDelay.split(',');
      for (const delay of delays) expect(Number.parseFloat(delay)).toBe(0);
    }
  });
});
