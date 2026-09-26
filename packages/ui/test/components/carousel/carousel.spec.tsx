/**
 * React performance of the carousel score, driven end to end. State moves only
 * through the setIndex reducer; arrow-key navigation is the composed
 * keyboard-handler primitive, shared verbatim with the DOM-native bind.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../src/components/carousel/carousel';
import {
  carouselBehavior,
  type CarouselConfig,
  type CarouselPart,
  type CarouselState,
} from '../../../src/components/carousel/carousel.behavior';

interface SetupProps {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  value?: number;
  defaultValue?: number;
  onIndexChange?: (index: number) => void;
}

function TestCarousel(props: SetupProps) {
  return (
    <Carousel {...props}>
      <CarouselPrevious />
      <CarouselContent>
        <CarouselItem>Slide one</CarouselItem>
        <CarouselItem>Slide two</CarouselItem>
        <CarouselItem>Slide three</CarouselItem>
      </CarouselContent>
      <CarouselNext />
      <CarouselIndicators />
    </Carousel>
  );
}

const body = () => document.body;

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
}

const root = () => partElement(body(), 'root') as HTMLElement;
const item = (index: number) =>
  body().querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  body().querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => body().querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => body().querySelector<HTMLButtonElement>('[data-part="next"]')!;
const config = (over: Partial<CarouselConfig> = {}): CarouselConfig => ({
  orientation: 'horizontal',
  loop: false,
  count: 3,
  label: undefined,
  value: undefined,
  defaultValue: 0,
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
  cleanup();
});

describe('carousel [react]', () => {
  it('fulfills the contract: parts present, ARIA equals the projection', () => {
    render(<TestCarousel />);
    assertContract(root(), { index: 0 }, config());
    assertInstances(root(), { index: 0 }, config());
  });

  it('opens on the first slide with previous disabled and next enabled', () => {
    render(<TestCarousel />);
    expect(root().getAttribute('aria-roledescription')).toBe('carousel');
    expect(item(0).getAttribute('data-state')).toBe('active');
    expect(item(0).getAttribute('aria-label')).toBe('1 of 3');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    expect(indicator(0).getAttribute('aria-current')).toBe('true');
  });

  it('next advances the active slide; prev/next disable at the bounds', async () => {
    const user = userEvent.setup();
    render(<TestCarousel />);
    await user.click(next());
    expect(item(1).getAttribute('data-state')).toBe('active');
    expect(previous().disabled).toBe(false);
    await user.click(next());
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(next().disabled).toBe(true);
    assertInstances(root(), { index: 2 }, config());
  });

  it('an indicator jumps directly to its slide (goto)', async () => {
    const user = userEvent.setup();
    render(<TestCarousel />);
    await user.click(indicator(2));
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(indicator(2).getAttribute('aria-current')).toBe('true');
    expect(indicator(0).hasAttribute('aria-current')).toBe(false);
  });

  it('arrow keys steer along the horizontal axis', async () => {
    const user = userEvent.setup();
    render(<TestCarousel />);
    next().focus();
    await user.keyboard('{ArrowRight}');
    expect(item(1).getAttribute('data-state')).toBe('active');
    await user.keyboard('{ArrowLeft}');
    expect(item(0).getAttribute('data-state')).toBe('active');
  });

  it('loop wraps past the ends and keeps both controls enabled', async () => {
    const user = userEvent.setup();
    render(<TestCarousel loop />);
    expect(previous().disabled).toBe(false);
    await user.click(previous());
    expect(item(2).getAttribute('data-state')).toBe('active');
    await user.click(next());
    expect(item(0).getAttribute('data-state')).toBe('active');
  });

  it('controlled: the callback reports the target, the prop drives the view', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    const { rerender } = render(<TestCarousel value={0} onIndexChange={onIndexChange} />);
    await user.click(next());
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    // Effective index has not moved -- the prop owns it.
    expect(item(0).getAttribute('data-state')).toBe('active');
    rerender(<TestCarousel value={1} onIndexChange={onIndexChange} />);
    expect(item(1).getAttribute('data-state')).toBe('active');
  });
});
