import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../../src/old/ui/input-group';

describe('InputGroup - Accessibility', () => {
  it('has no accessibility violations with aria-label', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Username" />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with associated label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email-input">Email address</label>
        <InputGroup>
          <InputGroupInput id="email-input" type="email" />
        </InputGroup>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with start addon', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon position="start" aria-hidden="true">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Amount in dollars" />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with end addon', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Price" />
        <InputGroupAddon position="end" aria-hidden="true">
          USD
        </InputGroupAddon>
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with both addons', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon position="start" aria-hidden="true">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Price in USD" placeholder="0.00" />
        <InputGroupAddon position="end" aria-hidden="true">
          USD
        </InputGroupAddon>
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon addon', async () => {
    const SearchIcon = () => (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="7" cy="7" r="5" stroke="currentColor" fill="none" />
        <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" />
      </svg>
    );

    const { container } = render(
      <InputGroup>
        <InputGroupAddon position="start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search" placeholder="Search..." />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with button addon', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Discount code" placeholder="Enter code" />
        <InputGroupAddon position="end">
          <button type="button">Apply</button>
        </InputGroupAddon>
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <InputGroup disabled>
        <InputGroupAddon position="start" aria-hidden="true">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Disabled amount" disabled />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when required', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon position="start" aria-hidden="true">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Required amount" required />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has visible focus indicator on input', () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupInput aria-label="Focus test" />
      </InputGroup>,
    );
    const group = screen.getByTestId('group');
    expect(group).toHaveClass('focus-within:ring-2');
  });

  it('sets aria-disabled on input when disabled', () => {
    render(
      <InputGroup>
        <InputGroupInput disabled aria-label="Disabled" />
      </InputGroup>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports aria-describedby for error messages', async () => {
    const { container } = render(
      <div>
        <label htmlFor="amount">Amount</label>
        <InputGroup>
          <InputGroupAddon position="start" aria-hidden="true">
            $
          </InputGroupAddon>
          <InputGroupInput id="amount" aria-invalid="true" aria-describedby="amount-error" />
        </InputGroup>
        <span id="amount-error">Amount must be greater than 0</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with placeholder', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Search" placeholder="Search..." />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with filled variant addon', async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon position="start" variant="filled" aria-hidden="true">
          https://
        </InputGroupAddon>
        <InputGroupInput aria-label="Website URL" placeholder="example.com" />
      </InputGroup>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with different sizes', async () => {
    const sizes = ['default', 'sm', 'lg'] as const;
    for (const size of sizes) {
      const { container } = render(
        <InputGroup size={size}>
          <InputGroupAddon position="start" aria-hidden="true">
            $
          </InputGroupAddon>
          <InputGroupInput aria-label={`Amount (${size} size)`} />
        </InputGroup>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });
});

describe('InputGroupAddon - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <InputGroupAddon position="start" aria-hidden="true">
        $
      </InputGroupAddon>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports aria-label for descriptive addons', async () => {
    const { container } = render(
      <InputGroupAddon position="start" aria-label="Currency symbol">
        $
      </InputGroupAddon>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('InputGroupInput - Accessibility', () => {
  it('has no accessibility violations with aria-label', async () => {
    const { container } = render(<InputGroupInput aria-label="Test input" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with associated label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="test-input">Test Label</label>
        <InputGroupInput id="test-input" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
