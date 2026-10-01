/**
 * select's items / enter row, measured in a real browser (#2412). The viewport,
 * the item collection's container, selects `stagger-items` (select.classes.ts);
 * this renders the real React select with thirteen items, injects the REAL
 * compiled select sheet (the Tailwind CLI, via the componentSheet browser
 * command), and reads each item's computed `animation-delay`.
 *
 * The nonzero step is set by a stylesheet, the way a designer's retune would
 * arrive. No script assigns, reads or computes an index: the ladder is the CSS
 * the exporter wrote.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/select/select';

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
  sheet = await commands.componentSheet('select');
}, 120_000);

afterEach(() => {
  cleanup();
  for (const style of injected.splice(0)) style.remove();
  document.body.replaceChildren();
});

function renderOpenSelect(): HTMLElement {
  const region = document.createElement('main');
  document.body.appendChild(region);
  render(
    <Select defaultOpen>
      <SelectTrigger aria-label="Options">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent aria-label="Options">
        {labels.map((label) => (
          <SelectItem key={label} value={label}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>,
    { container: region },
  );
  const first = document.querySelector<HTMLElement>('[data-part="item"]');
  const viewport = first?.parentElement;
  if (!viewport) throw new Error('viewport did not render');
  // :nth-child counts every child, so a stray wrapper would shift positions.
  expect(viewport.children).toHaveLength(ITEM_COUNT);
  return viewport;
}

/** Chromium serializes a computed time as seconds ("0.01s"); read it as ms. */
const delayMs = (element: Element): number => {
  const value = getComputedStyle(element).animationDelay;
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value);
  if (!match) throw new Error(`unparseable animation-delay "${value}"`);
  const amount = Number(match[1]);
  return match[2] === 's' ? amount * 1000 : amount;
};

const itemDelays = (viewport: HTMLElement): number[] =>
  Array.from(viewport.children, (item) => delayMs(item));

describe('select items / enter: the stagger-items ladder (#2412)', () => {
  it('at the default step the items carry no delay, entering with the content', () => {
    inject(sheet);
    const viewport = renderOpenSelect();
    expect(itemDelays(viewport)).toEqual(Array.from({ length: ITEM_COUNT }, () => 0));
  });

  it('with a nonzero step each position waits longer, and item 13 holds at item 12', () => {
    inject(sheet);
    inject(':root { --rafters-delay-stagger-step: 10ms; }');
    const viewport = renderOpenSelect();
    const delays = itemDelays(viewport);
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
    inject(':root { --rafters-delay-stagger-step: 10ms; }');
    const viewport = renderOpenSelect();
    for (const item of Array.from(viewport.children)) {
      const delays = getComputedStyle(item).transitionDelay.split(',');
      for (const delay of delays) expect(Number.parseFloat(delay)).toBe(0);
    }
  });
});
