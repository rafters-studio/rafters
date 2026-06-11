/**
 * Container fill prop (v2, #1637) -- fill is a SIGNATURE: word | word/alpha
 * | word-to-word, expanding to existing Tailwind utilities at the surface.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '../../src/components/ui/container';

function firstChild(container: HTMLElement): Element {
  const el = container.firstElementChild;
  expect(el).not.toBeNull();
  return el as Element;
}

describe('Container - fill prop', () => {
  it('resolves a semantic word with its paired foreground', () => {
    const { container } = render(<Container fill="primary">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-primary');
    expect(el.className).toContain('text-primary-foreground');
  });

  it('resolves word/alpha with Tailwind slash spelling', () => {
    const { container } = render(<Container fill="muted/50">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-muted/50');
  });

  it('resolves a family-position word literally, no foreground pairing', () => {
    const { container } = render(<Container fill="neutral-950/80">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-neutral-950/80');
    expect(el.className).not.toContain('text-neutral');
  });

  it('resolves word-to-word to a v4 linear gradient surface', () => {
    const { container } = render(<Container fill="primary-to-primary/0">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-linear-to-b');
    expect(el.className).toContain('from-primary');
    expect(el.className).toContain('to-primary/0');
    expect(el.className).not.toContain('bg-gradient');
  });

  it('sets data-fill attribute', () => {
    const { container } = render(<Container fill="primary">hi</Container>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBe('primary');
  });

  it('omits data-fill when not set', () => {
    const { container } = render(<Container>hi</Container>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBeNull();
  });

  it('fill prop takes precedence over background prop', () => {
    const { container } = render(
      <Container fill="primary" background="accent">
        hi
      </Container>,
    );
    const el = firstChild(container);
    expect(el.className).toContain('bg-primary');
    expect(el.className).not.toContain('bg-accent');
  });

  it('background prop still works when fill is not set (backwards compat)', () => {
    const { container } = render(<Container background="muted">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-muted');
  });

  it('expands unknown words optimistically -- the build-time safelist pass is the strict gate', () => {
    const { container } = render(<Container fill="custom-xyz">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-custom-xyz');
  });

  it('invalid signatures resolve to nothing instead of crashing', () => {
    const { container } = render(<Container fill="a-to-b-to-c">hi</Container>);
    const el = firstChild(container);
    expect(el.className).not.toContain('bg-a');
    expect(el.className).not.toContain('-to-');
  });
});
