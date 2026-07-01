import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Textarea } from '../../../src/old/ui/textarea';

describe('Textarea - Accessibility', () => {
  it('has no accessibility violations with aria-label', async () => {
    const { container } = render(<Textarea aria-label="Description" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with associated label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="message-input">Message</label>
        <Textarea id="message-input" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Textarea disabled aria-label="Disabled textarea" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when required', async () => {
    const { container } = render(<Textarea required aria-label="Required textarea" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has visible focus indicator', () => {
    render(<Textarea aria-label="Focus test" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('focus-visible:ring-2');
  });

  it('sets aria-disabled when disabled', () => {
    render(<Textarea disabled aria-label="Disabled" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports aria-describedby for error messages', async () => {
    const { container } = render(
      <div>
        <label htmlFor="bio">Bio</label>
        <Textarea id="bio" aria-invalid="true" aria-describedby="bio-error" />
        <span id="bio-error">Bio must be at least 50 characters</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with placeholder', async () => {
    const { container } = render(
      <Textarea aria-label="Comments" placeholder="Enter your comments..." />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
