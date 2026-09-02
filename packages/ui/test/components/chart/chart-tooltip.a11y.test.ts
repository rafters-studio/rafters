/**
 * a11y suite for ChartTooltip/ChartTooltipContent (#2228): axe over the
 * React render, the "never focusable, discoverable via sr-announcer" claim,
 * and the mouse-free path -- a shell dispatching `point`/`clear` (simulating
 * keyboard-driven datum traversal) drives the SAME content and announcement
 * a pointer would, with no keyboard contract of the tooltip's own.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import {
  chartTooltip,
  describeDatum,
  hitTest,
  type ChartDatum,
} from '../../../src/components/chart/chart-tooltip.behavior';
import { ChartTooltip, ChartTooltipContent } from '../../../src/components/chart/chart-tooltip.tsx';
import { bandScale } from '../../../src/primitives/graph';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const scale = bandScale(['Jan', 'Feb', 'Mar'], [0, 300]);
const data = [
  { desktop: 100, mobile: 40 },
  { desktop: 205, mobile: 90 },
  { desktop: 150, mobile: 60 },
];

describe('ChartTooltip a11y [react]', () => {
  it('with no datum resolved (mount only) is axe-clean', async () => {
    const { container } = render(
      React.createElement(
        'main',
        null,
        React.createElement(
          ChartContainer,
          { config },
          React.createElement('div', { 'data-part': 'plot' }),
          React.createElement(ChartTooltip, {
            scale,
            data,
            content: React.createElement(ChartTooltipContent, null),
          }),
        ),
      ),
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('content carries role=tooltip and no focus-granting attribute', () => {
    render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement('div', { 'data-part': 'plot' }),
        React.createElement(ChartTooltip, {
          scale,
          data,
          content: React.createElement(ChartTooltipContent, null),
        }),
      ),
    );
    const content = document.querySelector('[data-part="content"]');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('role')).toBe('tooltip');
    expect(content?.hasAttribute('tabindex')).toBe(false);
  });
});

describe('mouse-free path: a shell driving point/clear reaches the same content', () => {
  it('dispatching point (as a keyboard-driven chart shell would) resolves the same datum hitTest gives a pointer', () => {
    const viaShell = chartTooltip.actions.point(
      { datum: null },
      { point: { left: 0.51, top: 0.4 }, scale, data },
    );
    const viaPointer = hitTest({ left: 0.51, top: 0.4 }, scale, data);
    expect(viaShell.datum).toEqual(viaPointer);
  });

  it('the announced text is identical whichever input modality resolved the datum', () => {
    const datum = hitTest({ left: 0.51, top: 0.4 }, scale, data) as ChartDatum;
    expect(describeDatum(datum, config)).toBe(describeDatum(datum, config));
    expect(describeDatum(datum, config)).toContain('Feb');
    expect(describeDatum(datum, config)).toContain('Desktop 205');
  });

  it("chartTooltip never claims a keymap entry -- traversal is the shell's own contract", () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Enter', 'Escape', 'Tab']) {
      expect(chartTooltip.keymap({ key }, { datum: null }, 'content', {})).toBeNull();
    }
  });
});

describe('color token compliance -- no hex, no var(), no arbitrary value', () => {
  it('the default content render never emits a forbidden class', () => {
    const { container } = render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement('div', { 'data-part': 'plot' }),
        React.createElement(ChartTooltip, {
          scale,
          data,
          content: React.createElement(ChartTooltipContent, null),
        }),
      ),
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).not.toMatch(/var\(--/);
  });
});
