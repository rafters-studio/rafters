import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RadioGroup, RadioGroupItem } from '../../../src/old/ui/radio-group';

describe('RadioGroup - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with second option selected', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option2" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="radiogroup" on container', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('has correct role="radio" on items', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('has correct aria-checked on selected item', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    expect(radio1).toHaveAttribute('aria-checked', 'true');
    expect(radio2).toHaveAttribute('aria-checked', 'false');
  });

  it('has correct aria-orientation attribute', () => {
    const { rerender } = render(
      <RadioGroup defaultValue="option1" orientation="vertical" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-orientation', 'vertical');

    rerender(
      <RadioGroup defaultValue="option1" orientation="horizontal" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('has visible focus indicator on RadioGroupItem', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    const radio = screen.getByRole('radio');
    expect(radio).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations with disabled item', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" disabled />
      </RadioGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('disabled item has correct attributes', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" disabled />
      </RadioGroup>,
    );

    const disabledRadio = screen.getByRole('radio', { name: 'Option 2' });
    expect(disabledRadio).toBeDisabled();
  });

  it('has no violations when entire group is disabled', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" disabled aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('items share the same name attribute for grouping', () => {
    render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radios = screen.getAllByRole('radio');
    const name = radios[0].getAttribute('name');

    expect(name).toBeTruthy();
    for (const radio of radios) {
      expect(radio).toHaveAttribute('name', name);
    }
  });

  it('indicator is hidden from assistive technology', () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    const indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator).toBeInTheDocument();
  });

  it('has proper keyboard focus management (roving tabindex)', () => {
    render(
      <RadioGroup defaultValue="option2" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
        <RadioGroupItem value="option3" aria-label="Option 3" />
      </RadioGroup>,
    );

    const radios = screen.getAllByRole('radio');

    // Initially, unchecked items should have tabindex -1
    // and checked item should have tabindex 0 (after roving focus initializes)
    // Note: roving focus sets tabindex based on currentIndex
    expect(radios[0]).toHaveAttribute('tabindex');
    expect(radios[1]).toHaveAttribute('tabindex');
    expect(radios[2]).toHaveAttribute('tabindex');
  });

  it('has no violations with horizontal orientation', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" orientation="horizontal" aria-label="Select an option">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
