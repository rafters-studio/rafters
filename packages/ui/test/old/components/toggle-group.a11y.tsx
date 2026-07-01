import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ToggleGroup, ToggleGroupItem } from '../../../src/old/ui/toggle-group';

describe('ToggleGroup - Accessibility', () => {
  it('has no accessibility violations (single mode)', async () => {
    const { container } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
        <ToggleGroupItem value="c">Option C</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations (multiple mode)', async () => {
    const { container } = render(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="a">Bold</ToggleGroupItem>
        <ToggleGroupItem value="b">Italic</ToggleGroupItem>
        <ToggleGroupItem value="c">Underline</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with selected items', async () => {
    const { container } = render(
      <ToggleGroup type="single" defaultValue="a">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple selected items', async () => {
    const { container } = render(
      <ToggleGroup type="multiple" defaultValue={['a', 'c']}>
        <ToggleGroupItem value="a">Bold</ToggleGroupItem>
        <ToggleGroupItem value="b">Italic</ToggleGroupItem>
        <ToggleGroupItem value="c">Underline</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="group" on container', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has correct aria-pressed on items', () => {
    render(
      <ToggleGroup type="single" defaultValue="a">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('has data-orientation attribute for styling and keyboard behavior', () => {
    const { rerender } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'horizontal');

    rerender(
      <ToggleGroup type="single" orientation="vertical">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('has visible focus indicator on items', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <ToggleGroup type="single" disabled>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with individually disabled items', async () => {
    const { container } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b" disabled>
          B
        </ToggleGroupItem>
        <ToggleGroupItem value="c">C</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('disabled items have correct attributes', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b" disabled>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('button', { name: 'B' })).toBeDisabled();
  });

  it('has no violations with outline variant', async () => {
    const { container } = render(
      <ToggleGroup type="single" variant="outline">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('items are buttons with type="button"', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });
});
