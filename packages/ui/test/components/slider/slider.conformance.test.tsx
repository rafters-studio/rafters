/**
 * React render adapter + the shared slider conformance suite, plus the
 * retained-mode-only controlled-callback proof (gotcha #1).
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Slider, type SliderProps } from '../../../src/components/slider/slider';
import type { RenderResult } from '../../harness/conformance';
import {
  runSliderConformance,
  type SliderAdapter,
  type SliderScenarioProps,
} from './conformance-suite';

function toProps(props: SliderScenarioProps, label: string): SliderProps {
  return {
    variant: props.variant,
    size: props.size,
    defaultValue: props.value,
    min: props.min,
    max: props.max,
    step: props.step,
    orientation: props.orientation,
    disabled: props.disabled,
    'aria-label': label,
  };
}

const reactAdapter: SliderAdapter = {
  name: 'react',
  render(props, label): RenderResult {
    const utils = render(<Slider {...toProps(props, label)} />);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runSliderConformance(reactAdapter);

describe('slider controlled callback [react]', () => {
  it('a controlled slider never moves its own aria-valuenow but reports every change', async () => {
    const changes: number[][] = [];
    const { container } = render(
      <Slider value={[50]} onValueChange={(next) => changes.push(next)} aria-label="Volume" />,
    );
    const thumb = container.querySelector<HTMLElement>('[data-part="thumb"]');
    if (!thumb) throw new Error('no thumb');
    const user = userEvent.setup();
    thumb.focus();

    await user.keyboard('{ArrowRight}');
    // Effective value is pinned by the controlled prop -> stays 50...
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    // ...but the callback reports the value the consumer should adopt.
    expect(changes).toEqual([[51]]);

    await user.keyboard('{ArrowRight}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    expect(changes).toEqual([[51], [51]]);
  });

  it('a range reports the re-sorted array when a thumb crosses its neighbour', async () => {
    const changes: number[][] = [];
    const { container } = render(
      <Slider
        defaultValue={[20, 80]}
        onValueChange={(next) => changes.push(next)}
        aria-label="Range"
      />,
    );
    const thumbs = container.querySelectorAll<HTMLElement>('[data-part="thumb"]');
    const user = userEvent.setup();
    thumbs[0]?.focus();
    await user.keyboard('{End}'); // low thumb jumps to 100, past the high thumb
    // The reported array is always ascending.
    expect(changes.at(-1)).toEqual([80, 100]);
  });
});
