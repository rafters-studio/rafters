import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Spinner } from '../../../src/old/ui/spinner';

describe('Spinner - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Spinner />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all size variants', async () => {
    const sizes = ['sm', 'default', 'lg'] as const;
    for (const size of sizes) {
      const { container } = render(<Spinner size={size} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with custom aria-label', async () => {
    const { container } = render(<Spinner aria-label="Processing request" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in a form context', async () => {
    const { container } = render(
      <form>
        <button type="submit" disabled>
          <Spinner size="sm" aria-label="Submitting" />
          Submitting...
        </button>
      </form>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used as loading indicator', async () => {
    const { container } = render(
      <output aria-live="polite">
        <Spinner />
        <span className="sr-only">Content is loading</span>
      </output>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('includes motion-reduce class for reduced motion support', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('motion-reduce:animate-none');
  });
});
