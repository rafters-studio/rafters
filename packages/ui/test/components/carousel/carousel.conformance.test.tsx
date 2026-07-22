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
import { carouselBehavior } from '../../../src/components/carousel/carousel.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

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
const root = () => partElement(body(), 'root') as HTMLElement;
const item = (index: number) =>
  body().querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  body().querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => body().querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => body().querySelector<HTMLButtonElement>('[data-part="next"]')!;
const config = (over: Record<string, unknown> = {}) => ({
  orientation: 'horizontal' as const,
  loop: false,
  count: 3,
  label: undefined,
  value: undefined,
  defaultValue: 0,
  ...over,
});

afterEach(() => {
  cleanup();
});

describe('carousel conformance [react]', () => {
  it('fulfills the contract: parts present, ARIA equals the projection', async () => {
    render(<TestCarousel />);
    assertContractFulfillment(carouselBehavior, root(), { index: 0 }, config(), [
      'root',
      'content',
      'track',
      'item',
      'previous',
      'next',
      'indicators',
      'indicator',
    ]);
    assertInstanceAriaFulfillment(carouselBehavior, root(), { index: 0 }, config());
    await assertAxeClean(body());
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
    assertInstanceAriaFulfillment(carouselBehavior, root(), { index: 2 }, config());
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
