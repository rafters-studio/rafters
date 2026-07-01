/**
 * Card fill prop (v2, #1637) -- fill is a SIGNATURE: word | word/alpha |
 * word-to-word, expanding to existing Tailwind utilities at the surface.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../../src/old/ui/card';

function firstChild(container: HTMLElement): Element {
  const el = container.firstElementChild;
  expect(el).not.toBeNull();
  return el as Element;
}

describe('Card - fill prop', () => {
  it('resolves fill="primary" to primary surface with paired foreground', () => {
    const { container } = render(<Card fill="primary">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-primary');
    expect(el.className).toContain('text-primary-foreground');
  });

  it('resolves the panel role word -- the elevated panel surface', () => {
    const { container } = render(<Card fill="panel">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-panel');
    expect(el.className).toContain('text-panel-foreground');
  });

  it('resolves word/alpha scrims', () => {
    const { container } = render(<Card fill="foreground/80">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-foreground/80');
  });

  it('resolves gradient signatures to v4 utilities', () => {
    const { container } = render(<Card fill="primary-to-primary/0">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-linear-to-b');
    expect(el.className).not.toContain('bg-gradient');
  });

  it('sets data-fill attribute', () => {
    const { container } = render(<Card fill="primary">content</Card>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBe('primary');
  });

  it('expands unknown words optimistically -- build-time safelist is the strict gate', () => {
    const { container } = render(<Card fill="custom-brand">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-custom-brand');
  });

  it('default Card without fill retains base card surface', () => {
    const { container } = render(<Card>content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-card');
    expect(el.className).toContain('text-card-foreground');
  });
});
