import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Field } from '../../../src/old/ui/field';
import { Input } from '../../../src/old/ui/input';

describe('Field - Accessibility', () => {
  it('has no accessibility violations with basic usage', async () => {
    const { container } = render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with required field', async () => {
    const { container } = render(
      <Field label="Username" required>
        <Input />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with description', async () => {
    const { container } = render(
      <Field label="Password" description="Must be at least 8 characters">
        <Input type="password" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with error state', async () => {
    const { container } = render(
      <Field label="Email" error="Invalid email address">
        <Input type="email" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with disabled state', async () => {
    const { container } = render(
      <Field label="Disabled Field" disabled>
        <Input />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all features combined', async () => {
    const { container } = render(
      <Field label="Full Name" description="Enter your legal name" required id="full-name">
        <Input />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with error and description combined', async () => {
    const { container } = render(
      <Field
        label="Email"
        description="We will never share your email"
        error="Please enter a valid email"
      >
        <Input type="email" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in a form context', async () => {
    const { container } = render(
      <form>
        <Field label="First Name" required>
          <Input />
        </Field>
        <Field label="Last Name" required>
          <Input />
        </Field>
        <Field label="Email" description="For account recovery">
          <Input type="email" />
        </Field>
        <button type="submit">Submit</button>
      </form>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom ID', async () => {
    const { container } = render(
      <Field label="Custom ID Field" id="custom-field-id">
        <Input />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with native input element', async () => {
    const { container } = render(
      <Field label="Native Input">
        <input type="text" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with textarea', async () => {
    const { container } = render(
      <Field label="Comments" description="Optional feedback">
        <textarea />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with select element', async () => {
    const { container } = render(
      <Field label="Country">
        <select>
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with password input and error', async () => {
    const { container } = render(
      <Field
        label="Password"
        description="Must contain uppercase, lowercase, and numbers"
        error="Password does not meet requirements"
        required
      >
        <Input type="password" />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple fields in fieldset', async () => {
    const { container } = render(
      <fieldset>
        <legend>Contact Information</legend>
        <Field label="Phone" description="Including country code">
          <Input type="tel" />
        </Field>
        <Field label="Address">
          <Input />
        </Field>
        <Field label="City" required>
          <Input />
        </Field>
      </fieldset>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with aria attributes on container', async () => {
    const { container } = render(
      <Field label="Accessible Field" aria-label="Custom aria label" data-testid="accessible-field">
        <Input />
      </Field>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Field - Accessibility associations', () => {
  it('properly associates label with input', async () => {
    const { container, getByText, getByRole } = render(
      <Field label="Labeled Input" id="labeled-input">
        <Input />
      </Field>,
    );

    const label = getByText('Labeled Input');
    const input = getByRole('textbox');

    expect(label).toHaveAttribute('for', 'labeled-input');
    expect(input).toHaveAttribute('id', 'labeled-input');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('properly associates description with input', async () => {
    const { container, getByRole, getByText } = render(
      <Field label="With Description" description="This is helpful" id="desc-field">
        <Input />
      </Field>,
    );

    const input = getByRole('textbox');
    const description = getByText('This is helpful');

    expect(input).toHaveAttribute('aria-describedby', 'desc-field-description');
    expect(description).toHaveAttribute('id', 'desc-field-description');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('properly associates error with input', async () => {
    const { container, getByRole } = render(
      <Field label="With Error" error="This is an error" id="error-field">
        <Input />
      </Field>,
    );

    const input = getByRole('textbox');
    const error = getByRole('alert');

    expect(input).toHaveAttribute('aria-describedby', 'error-field-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(error).toHaveAttribute('id', 'error-field-error');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
