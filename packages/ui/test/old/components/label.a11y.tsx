import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Label } from '../../../src/old/ui/label';

describe('Label - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Label>Email</Label>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when associated with input', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="email-input">Email Address</Label>
        <input id="email-input" type="email" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with required field', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="required-input">
          Required Field <span aria-hidden="true">*</span>
        </Label>
        <input id="required-input" type="text" required aria-required="true" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom attributes', async () => {
    const { container } = render(
      <Label id="custom-label" aria-describedby="helper-text">
        Username
      </Label>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple form fields', async () => {
    const { container } = render(
      <form>
        <div>
          <Label htmlFor="first-name">First Name</Label>
          <input id="first-name" type="text" />
        </div>
        <div>
          <Label htmlFor="last-name">Last Name</Label>
          <input id="last-name" type="text" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </div>
      </form>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when wrapping input', async () => {
    const { container } = render(
      <Label>
        Phone Number
        <input type="tel" />
      </Label>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
