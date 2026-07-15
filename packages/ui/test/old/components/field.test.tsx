import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Field } from '../../../src/old/ui/field';
import { Input } from '../../../src/old/ui/input';

describe('Field', () => {
  it('renders with label and children', () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders as a div element', () => {
    const { container } = render(
      <Field label="Name">
        <Input />
      </Field>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('applies base layout classes', () => {
    const { container } = render(
      <Field label="Username">
        <Input />
      </Field>,
    );
    const field = container.firstChild;
    expect(field).toHaveClass('flex');
    expect(field).toHaveClass('flex-col');
    expect(field).toHaveClass('gap-2');
  });

  it('merges custom className', () => {
    const { container } = render(
      <Field label="Custom" className="custom-class">
        <Input />
      </Field>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref to container div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Field ref={ref} label="With Ref">
        <Input />
      </Field>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <Field data-testid="field" aria-label="Form field" label="Test">
        <Input />
      </Field>,
    );
    const field = screen.getByTestId('field');
    expect(field).toHaveAttribute('aria-label', 'Form field');
  });
});

describe('Field - Label association', () => {
  it('associates label with input via generated ID', () => {
    render(
      <Field label="Generated ID">
        <Input />
      </Field>,
    );
    const label = screen.getByText('Generated ID');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for');
    expect(input).toHaveAttribute('id', label.getAttribute('for'));
  });

  it('uses custom ID when provided', () => {
    render(
      <Field label="Custom ID" id="my-custom-id">
        <Input />
      </Field>,
    );
    const label = screen.getByText('Custom ID');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'my-custom-id');
    expect(input).toHaveAttribute('id', 'my-custom-id');
  });

  it('preserves child ID if already set', () => {
    render(
      <Field label="Existing ID">
        <Input id="existing-input-id" />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'existing-input-id');
  });
});

describe('Field - Required state', () => {
  it('shows required indicator when required prop is true', () => {
    render(
      <Field label="Required Field" required>
        <Input />
      </Field>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('hides required indicator with aria-hidden', () => {
    render(
      <Field label="Required Field" required>
        <Input />
      </Field>,
    );
    const asterisk = screen.getByText('*');
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies destructive color to required indicator', () => {
    render(
      <Field label="Required Field" required>
        <Input />
      </Field>,
    );
    const asterisk = screen.getByText('*');
    expect(asterisk).toHaveClass('text-destructive');
  });

  it('sets aria-required on input when required', () => {
    render(
      <Field label="Required Input" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('does not show indicator when not required', () => {
    render(
      <Field label="Optional Field">
        <Input />
      </Field>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});

describe('Field - Description', () => {
  it('renders description text', () => {
    render(
      <Field label="Email" description="We will never share your email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();
  });

  it('applies muted text styling to description', () => {
    render(
      <Field label="Email" description="Help text">
        <Input />
      </Field>,
    );
    const description = screen.getByText('Help text');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');
  });

  it('renders description as paragraph', () => {
    render(
      <Field label="Email" description="Help text">
        <Input />
      </Field>,
    );
    const description = screen.getByText('Help text');
    expect(description.tagName).toBe('P');
  });

  it('connects input to description via aria-describedby', () => {
    render(
      <Field label="Email" description="Format hint" id="email-field">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'email-field-description');
  });
});

describe('Field - Error state', () => {
  it('renders error message', () => {
    render(
      <Field label="Password" error="Password is required">
        <Input type="password" />
      </Field>,
    );
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('applies destructive styling to error message', () => {
    render(
      <Field label="Password" error="Invalid password">
        <Input />
      </Field>,
    );
    const error = screen.getByText('Invalid password');
    expect(error).toHaveClass('text-sm');
    expect(error).toHaveClass('text-destructive');
  });

  it('renders error as paragraph with role="alert"', () => {
    render(
      <Field label="Password" error="Error message">
        <Input />
      </Field>,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Error message');
    expect(error.tagName).toBe('P');
  });

  it('sets aria-invalid on input when error is present', () => {
    render(
      <Field label="Email" error="Invalid email">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('connects input to error via aria-describedby', () => {
    render(
      <Field label="Email" error="Error text" id="email-field">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'email-field-error');
  });

  it('prioritizes error over description in display', () => {
    render(
      <Field label="Email" description="Help text" error="Error text">
        <Input />
      </Field>,
    );
    expect(screen.getByText('Error text')).toBeInTheDocument();
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });

  it('includes both error and description in aria-describedby when both exist', () => {
    render(
      <Field label="Email" description="Help text" error="Error text" id="email-field">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'email-field-error email-field-description');
  });
});

describe('Field - Disabled state', () => {
  it('passes disabled prop to child input', () => {
    render(
      <Field label="Disabled Field" disabled>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies opacity to label when disabled', () => {
    render(
      <Field label="Disabled Field" disabled>
        <Input />
      </Field>,
    );
    const label = screen.getByText('Disabled Field');
    expect(label).toHaveClass('opacity-50');
  });

  it('does not override child disabled prop if already set', () => {
    render(
      <Field label="Field">
        <Input disabled />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});

describe('Field - Multiple children', () => {
  it('enhances first valid element child', () => {
    render(
      <Field label="Multi">
        <Input data-testid="input" />
      </Field>,
    );
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('id');
  });

  it('handles non-element children gracefully', () => {
    render(
      <Field label="With Text">
        Some text
        <Input data-testid="input" />
      </Field>,
    );
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });
});

describe('Field - Composition', () => {
  it('works with different input types', () => {
    render(
      <Field label="Password" required error="Too weak">
        <input type="password" data-testid="password-input" />
      </Field>,
    );

    const input = screen.getByTestId('password-input');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders complete field with all features', () => {
    render(
      <Field
        label="Email Address"
        description="We will never share your email"
        required
        id="complete-field"
        data-testid="complete-field"
      >
        <Input type="email" />
      </Field>,
    );

    // Check structure
    expect(screen.getByTestId('complete-field')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();

    // Check associations
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'complete-field');
    expect(input).toHaveAttribute('aria-describedby', 'complete-field-description');
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});
