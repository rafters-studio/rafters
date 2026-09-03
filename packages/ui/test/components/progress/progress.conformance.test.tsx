import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Progress } from '../../../src/components/progress/progress';
import { progress, type ProgressConfig } from '../../../src/components/progress/progress.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;
const parts = ['root', 'indicator'] as const;

afterEach(() => {
  cleanup();
});

describe('progress conformance [react]', () => {
  it('determinate: progressbar contract fulfilled against real DOM', async () => {
    const config: ProgressConfig = { value: 66, max: 100, variant: 'default', size: 'default' };
    render(
      <main>
        <Progress value={66} aria-label="Upload progress" />
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-valuenow')).toBe('66');
    expect(root.getAttribute('aria-busy')).toBeNull();
    assertContractFulfillment(progress, root, {}, config, parts);
    await assertAxeClean(body());
  });

  it('the indicator fill width tracks the value', () => {
    render(<Progress value={25} aria-label="Loading" />);
    const indicator = partElement(body(), 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('25%');
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
  });

  it('custom max: valuenow/valuemax and label reflect it', () => {
    render(<Progress value={3} max={10} aria-label="Files" />);
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.getAttribute('aria-valuemax')).toBe('10');
    expect(root.getAttribute('aria-valuenow')).toBe('3');
    expect(root.getAttribute('aria-valuetext')).toBe('30%');
  });

  it('getValueLabel overrides the default percentage label', () => {
    render(
      <Progress value={3} max={10} aria-label="Files" getValueLabel={(v, m) => `${v} of ${m}`} />,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.getAttribute('aria-valuetext')).toBe('3 of 10');
  });

  it('indeterminate: omits valuenow, sets aria-busy, no inline width', async () => {
    const config: ProgressConfig = { max: 100, variant: 'default', size: 'default' };
    render(
      <main>
        <Progress aria-label="Loading" />
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('true');
    const indicator = partElement(body(), 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('');
    expect(indicator.className).toContain('animate-pulse-shimmer');
    assertContractFulfillment(progress, root, {}, config, parts);
    await assertAxeClean(body());
  });

  it('a progressbar with no accessible name FAILS axe (name is required)', async () => {
    render(
      <main>
        <Progress value={50} />
      </main>,
    );
    const results = await axe(body());
    expect(results.violations.map((v) => v.id)).toContain('aria-progressbar-name');
  });
});
