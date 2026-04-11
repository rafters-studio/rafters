import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '../../src/components/ui/container';

function firstChild(container: HTMLElement): Element {
  const el = container.firstElementChild;
  expect(el).not.toBeNull();
  return el as Element;
}

describe('Container - fill prop', () => {
  it('resolves fill="surface" to registry classes', () => {
    const { container } = render(<Container fill="surface">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-neutral-900');
    expect(el.className).toContain('text-neutral-100');
  });

  it('resolves fill="panel" with opacity', () => {
    const { container } = render(<Container fill="panel">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-neutral-800/95');
  });

  it('resolves fill="overlay" with backdrop blur', () => {
    const { container } = render(<Container fill="overlay">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-neutral-950/80');
    expect(el.className).toContain('backdrop-blur-sm');
  });

  it('resolves fill="hero" to a gradient surface', () => {
    const { container } = render(<Container fill="hero">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-gradient-to-b');
    expect(el.className).toContain('from-primary');
    expect(el.className).toContain('to-primary/0');
  });

  it('sets data-fill attribute', () => {
    const { container } = render(<Container fill="surface">hi</Container>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBe('surface');
  });

  it('omits data-fill when not set', () => {
    const { container } = render(<Container>hi</Container>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBeNull();
  });

  it('fill prop takes precedence over background prop', () => {
    const { container } = render(
      <Container fill="surface" background="accent">
        hi
      </Container>,
    );
    const el = firstChild(container);
    // fill's bg class should be present
    expect(el.className).toContain('bg-neutral-900');
    // legacy background class should NOT be present
    expect(el.className).not.toContain('bg-accent');
  });

  it('background prop still works when fill is not set (backwards compat)', () => {
    const { container } = render(<Container background="muted">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-muted');
  });

  it('falls back to bg-{name} for unknown fill token', () => {
    const { container } = render(<Container fill="custom-xyz">hi</Container>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-custom-xyz');
  });
});
