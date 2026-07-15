import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Alert, AlertDescription, AlertTitle } from '../../../src/old/ui/alert';

describe('Alert - Accessibility', () => {
  it('has no accessibility violations with default variant', async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>This is a default alert message.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with info variant', async () => {
    const { container } = render(
      <Alert variant="info">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>This is an informational message.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with success variant', async () => {
    const { container } = render(
      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Your action was successful.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with warning variant', async () => {
    const { container } = render(
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please proceed with caution.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with destructive variant', async () => {
    const { container } = render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all variants', async () => {
    const variants = ['default', 'info', 'success', 'warning', 'destructive'] as const;
    for (const variant of variants) {
      const { container } = render(
        <Alert variant={variant}>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>Alert description content.</AlertDescription>
        </Alert>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has role="alert" for screen reader announcement', async () => {
    const { container } = render(
      <Alert>
        <AlertDescription>Important message</AlertDescription>
      </Alert>,
    );
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon present', async () => {
    const { container } = render(
      <Alert variant="info">
        <svg className="h-4 w-4" aria-hidden="true">
          <circle cx="8" cy="8" r="8" />
        </svg>
        <div>
          <AlertTitle>Info with Icon</AlertTitle>
          <AlertDescription>Alert with decorative icon.</AlertDescription>
        </div>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in a list context', async () => {
    const { container } = render(
      <div>
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>First alert message.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>Second alert message.</AlertDescription>
        </Alert>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <Alert aria-labelledby="alert-title" aria-describedby="alert-desc">
        <AlertTitle id="alert-title">Custom ARIA Alert</AlertTitle>
        <AlertDescription id="alert-desc">Custom ARIA description.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with role="status" for non-urgent messages', async () => {
    const { container } = render(
      <Alert role="status">
        <AlertTitle>Status Update</AlertTitle>
        <AlertDescription>This is a non-urgent status message.</AlertDescription>
      </Alert>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
