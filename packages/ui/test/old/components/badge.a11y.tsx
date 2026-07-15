import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Badge } from '../../../src/old/ui/badge';

describe('Badge - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Badge>Status</Badge>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all variants', async () => {
    const variants = [
      'default',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'outline',
    ] as const;
    for (const variant of variants) {
      const { container } = render(<Badge variant={variant}>Test</Badge>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with custom attributes', async () => {
    const { container } = render(
      <Badge aria-label="status indicator" role="status">
        Active
      </Badge>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in lists', async () => {
    const { container } = render(
      <ul>
        <li>
          Item 1 <Badge variant="success">Active</Badge>
        </li>
        <li>
          Item 2 <Badge variant="warning">Pending</Badge>
        </li>
      </ul>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
