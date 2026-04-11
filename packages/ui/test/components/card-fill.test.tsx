import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../src/components/ui/card';

function firstChild(container: HTMLElement): Element {
  const el = container.firstElementChild;
  expect(el).not.toBeNull();
  return el as Element;
}

describe('Card - fill prop', () => {
  it('resolves fill="surface" to registry classes', () => {
    const { container } = render(<Card fill="surface">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-neutral-900');
    expect(el.className).toContain('text-neutral-100');
  });

  it('resolves fill="primary" to primary surface', () => {
    const { container } = render(<Card fill="primary">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('bg-primary');
    expect(el.className).toContain('text-primary-foreground');
  });

  it('resolves fill="glass" with backdrop blur', () => {
    const { container } = render(<Card fill="glass">content</Card>);
    const el = firstChild(container);
    expect(el.className).toContain('backdrop-blur-md');
  });

  it('sets data-fill attribute', () => {
    const { container } = render(<Card fill="surface">content</Card>);
    const el = firstChild(container);
    expect(el.getAttribute('data-fill')).toBe('surface');
  });

  it('falls back to bg-{name} for unknown fill token', () => {
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
