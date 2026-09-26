/**
 * Astro performance of the carousel score, driven end to end. AstroContainer
 * renders the SSR markup with the initial projection already applied, but does
 * NOT run the <script>, so the test calls bindCarousel directly -- that IS the
 * script's job -- then drives the same score the React and WC performances
 * drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Carousel from '../../../src/components/carousel/carousel.astro';
import {
  bindCarousel,
  carouselBehavior,
  type CarouselConfig,
  type CarouselPart,
  type CarouselState,
} from '../../../src/components/carousel/carousel.behavior';

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
}

const slides = ['Slide one', 'Slide two', 'Slide three'];
const config = (over: Partial<CarouselConfig> = {}): CarouselConfig => ({
  orientation: 'horizontal',
  loop: false,
  count: 3,
  label: undefined,
  ...over,
});

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

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(loop = false): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: { id: 'gallery', slides, indicators: true, loop },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('div[data-part="root"][data-carousel]') as HTMLElement;
  bindCarousel(root); // the <script> does this per instance on the real page
  return root;
}

const item = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => document.body.querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => document.body.querySelector<HTMLButtonElement>('[data-part="next"]')!;

describe('carousel [astro]', () => {
  it('SSR fulfills the contract: parts present, ARIA equals the projection', async () => {
    const root = await mount();
    assertContract(root, { index: 0 }, config());
    assertInstances(root, { index: 0 }, config());
  });

  it('SSR renders the slide bodies and marks the first slide active', async () => {
    await mount();
    expect(item(0).textContent).toContain('Slide one');
    expect(item(0).getAttribute('data-state')).toBe('active');
    expect(item(0).getAttribute('aria-label')).toBe('1 of 3');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
  });

  it('next advances the active slide after bind', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(next());
    expect(item(1).getAttribute('data-state')).toBe('active');
    expect(previous().disabled).toBe(false);
  });

  it('an indicator jumps directly to its slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(indicator(2));
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(indicator(2).getAttribute('aria-current')).toBe('true');
  });

  it('loop wraps past the start', async () => {
    const user = userEvent.setup();
    await mount(true);
    await user.click(previous());
    expect(item(2).getAttribute('data-state')).toBe('active');
  });
});
