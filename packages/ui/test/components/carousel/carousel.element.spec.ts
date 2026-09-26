/**
 * WC performance of the carousel score, driven end to end against light-DOM
 * markup. Same score as the React spec -- the only difference is the
 * controller applies the projection imperatively.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  carouselBehavior,
  type CarouselConfig,
  type CarouselPart,
  type CarouselState,
} from '../../../src/components/carousel/carousel.behavior';
import { RaftersCarousel } from '../../../src/components/carousel/carousel.element';

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
}

const ALL_PARTS: ReadonlyArray<CarouselPart> = [
  'root',
  'content',
  'track',
  'item',
  'previous',
  'next',
  'indicators',
  'indicator',
];

/** Every declared part present, and its rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(rootEl: HTMLElement, state: CarouselState, cfg: CarouselConfig): void {
  for (const part of ALL_PARTS) {
    const element = partElement(rootEl, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const declaredRole = carouselBehavior.parts[part].role;
    if (declaredRole) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(declaredRole);
    }
  }
  const ids: Record<CarouselPart, string> = Object.fromEntries(
    ALL_PARTS.map((part) => [part, partElement(rootEl, part)?.id ?? '']),
  ) as Record<CarouselPart, string>;
  const projection = carouselBehavior.aria(state, cfg, ids);
  for (const part of ALL_PARTS) {
    const attrs = projection[part];
    if (!attrs) continue;
    const element = partElement(rootEl, part);
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/** Every rendered instance of the `item`/`indicator` many-parts, ARIA equal to
 *  the score's per-instance projection. */
function assertInstances(rootEl: HTMLElement, state: CarouselState, cfg: CarouselConfig): void {
  const project = carouselBehavior.instanceAria;
  if (!project) return;
  const ids: Record<CarouselPart, string> = Object.fromEntries(
    ALL_PARTS.map((part) => [part, partElement(rootEl, part)?.id ?? '']),
  ) as Record<CarouselPart, string>;
  for (const part of ['item', 'indicator'] as const) {
    for (const element of partElements(rootEl, part)) {
      const value = element.dataset['value'];
      if (value === undefined) continue;
      const projected = project(part, value, state, cfg, ids);
      for (const [attr, expected] of Object.entries(projected)) {
        if (expected === undefined) {
          expect(
            element.hasAttribute(attr),
            `instance "${value}" of "${part}" must NOT render ${attr}`,
          ).toBe(false);
        } else {
          expect(element.getAttribute(attr), `instance "${value}" of "${part}" ${attr}`).toBe(
            String(expected),
          );
        }
      }
    }
  }
}

beforeAll(() => {
  if (!customElements.get('rafters-carousel')) {
    customElements.define('rafters-carousel', RaftersCarousel);
  }
});

async function mount(loop = false): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-carousel data-loop="${loop}">
      <button type="button" data-part="previous">prev</button>
      <div data-part="content">
        <div data-part="track">
          <div role="group" data-part="item" data-value="0">Slide one</div>
          <div role="group" data-part="item" data-value="1">Slide two</div>
          <div role="group" data-part="item" data-value="2">Slide three</div>
        </div>
      </div>
      <button type="button" data-part="next">next</button>
      <div role="group" data-part="indicators">
        <button type="button" data-part="indicator" data-value="0"></button>
        <button type="button" data-part="indicator" data-value="1"></button>
        <button type="button" data-part="indicator" data-value="2"></button>
      </div>
    </rafters-carousel>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-carousel') as HTMLElement;
}

const item = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => document.body.querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => document.body.querySelector<HTMLButtonElement>('[data-part="next"]')!;
const config = (over: Partial<CarouselConfig> = {}): CarouselConfig => ({
  orientation: 'horizontal',
  loop: false,
  count: 3,
  label: undefined,
  defaultValue: 0,
  ...over,
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('carousel [wc]', () => {
  it('fulfills the contract after the deferred bind', async () => {
    const root = await mount();
    assertContract(root, { index: 0 }, config());
    assertInstances(root, { index: 0 }, config());
  });

  it('first slide active, previous disabled, next enabled', async () => {
    await mount();
    expect(item(0).getAttribute('data-state')).toBe('active');
    expect(item(0).getAttribute('aria-label')).toBe('1 of 3');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    expect(indicator(0).getAttribute('aria-current')).toBe('true');
  });

  it('next advances and disables at the last slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(next());
    expect(item(1).getAttribute('data-state')).toBe('active');
    await user.click(next());
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(next().disabled).toBe(true);
  });

  it('an indicator jumps directly to its slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(indicator(2));
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(indicator(2).getAttribute('aria-current')).toBe('true');
  });

  it('arrow keys steer along the horizontal axis', async () => {
    const user = userEvent.setup();
    await mount();
    next().focus();
    await user.keyboard('{ArrowRight}');
    expect(item(1).getAttribute('data-state')).toBe('active');
    await user.keyboard('{ArrowLeft}');
    expect(item(0).getAttribute('data-state')).toBe('active');
  });

  it('loop wraps past the ends', async () => {
    const user = userEvent.setup();
    await mount(true);
    expect(previous().disabled).toBe(false);
    await user.click(previous());
    expect(item(2).getAttribute('data-state')).toBe('active');
  });
});
