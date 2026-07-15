import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Kbd } from '../../../src/old/ui/kbd';

describe('Kbd - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Kbd>K</Kbd>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with symbols', async () => {
    const { container } = render(<Kbd>⌘</Kbd>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with aria-label', async () => {
    const { container } = render(<Kbd aria-label="Command key">⌘</Kbd>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in context', async () => {
    const { container } = render(
      <p>
        Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to open the command palette.
      </p>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple kbd elements', async () => {
    const { container } = render(
      <div>
        <p>
          Save: <Kbd>⌘</Kbd> + <Kbd>S</Kbd>
        </p>
        <p>
          Copy: <Kbd>⌘</Kbd> + <Kbd>C</Kbd>
        </p>
        <p>
          Paste: <Kbd>⌘</Kbd> + <Kbd>V</Kbd>
        </p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with short words', async () => {
    const { container } = render(
      <p>
        Press <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> to submit.
      </p>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
