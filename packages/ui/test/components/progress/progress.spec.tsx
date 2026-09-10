import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { run as axe } from 'axe-core';
import { Progress } from '../../../src/components/progress/progress';
import {
  progress,
  type ProgressConfig,
  type ProgressPart,
  type ProgressState,
} from '../../../src/components/progress/progress.behavior';

const body = () => document.body;
const parts: readonly ProgressPart[] = ['root', 'indicator'];

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function domPartIds(
  root: HTMLElement,
  expectedParts: readonly ProgressPart[],
): Record<ProgressPart, string> {
  const ids = {} as Record<ProgressPart, string>;
  for (const part of expectedParts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part renders (with its role), and the rendered ARIA equals
 *  the score's projection -- including absence: a projected `undefined` means
 *  the attribute must not be rendered. */
function assertContractFulfillment(
  root: HTMLElement,
  state: ProgressState,
  config: ProgressConfig,
  expectedParts: readonly ProgressPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = progress.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }

  const allParts = Object.keys(progress.parts) as ProgressPart[];
  const ids = domPartIds(root, allParts);
  const projection = progress.aria(state, config, ids);

  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
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

afterEach(() => {
  cleanup();
});

describe('progress [react]', () => {
  it('determinate: progressbar contract fulfilled against real DOM', () => {
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
    assertContractFulfillment(root, {}, config, parts);
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

  it('indeterminate: omits valuenow, sets aria-busy, no inline width', () => {
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
    assertContractFulfillment(root, {}, config, parts);
  });

  it('a progressbar with no accessible name FAILS axe (name is required)', async () => {
    // Not covered by progress.a11y.tsx, which only exercises named scenes: this
    // is the guard that Progress never fabricates a default accessible name.
    render(
      <main>
        <Progress value={50} />
      </main>,
    );
    const results = await axe(body());
    expect(results.violations.map((v) => v.id)).toContain('aria-progressbar-name');
  });
});
