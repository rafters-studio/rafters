import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from '../../../src/old/ui/button';

describe('Button - Accessibility', () => {
  it('has no accessibility violations with default variant', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all variants', async () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost'] as const;
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with all sizes', async () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;
    for (const size of sizes) {
      const { container } = render(
        <Button size={size} aria-label={size === 'icon' ? 'Icon button' : undefined}>
          {size === 'icon' ? 'X' : 'Button'}
        </Button>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <Button aria-label="Custom action" aria-describedby="description">
        Action
      </Button>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with asChild anchor', async () => {
    const { container } = render(
      <Button asChild>
        <a href="/test">Link styled as button</a>
      </Button>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in a form', async () => {
    const { container } = render(
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
        <Button type="submit">Submit</Button>
      </form>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon-only button with aria-label', async () => {
    const { container } = render(
      <Button size="icon" aria-label="Close dialog">
        X
      </Button>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when combining variants and sizes', async () => {
    const { container } = render(
      <div>
        <Button variant="default" size="sm">
          Small Default
        </Button>
        <Button variant="secondary" size="lg">
          Large Secondary
        </Button>
        <Button variant="destructive" size="icon" aria-label="Delete">
          X
        </Button>
        <Button variant="outline" size="default">
          Outline
        </Button>
        <Button variant="ghost" size="sm">
          Ghost
        </Button>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in button group context', async () => {
    const { container } = render(
      // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for button groups per WAI-ARIA APG
      <div role="group" aria-label="Actions">
        <Button variant="default">Save</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
