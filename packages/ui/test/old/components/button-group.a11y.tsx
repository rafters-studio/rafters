import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from '../../../src/old/ui/button';
import { ButtonGroup } from '../../../src/old/ui/button-group';

describe('ButtonGroup - Accessibility', () => {
  it('has no accessibility violations with default setup', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Actions">
        <Button>Save</Button>
        <Button>Cancel</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with horizontal orientation', async () => {
    const { container } = render(
      <ButtonGroup orientation="horizontal" aria-label="Navigation">
        <Button>Previous</Button>
        <Button>Next</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with vertical orientation', async () => {
    const { container } = render(
      <ButtonGroup orientation="vertical" aria-label="View options">
        <Button>Grid</Button>
        <Button>List</Button>
        <Button>Table</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all size variants', async () => {
    const sizes = ['default', 'sm', 'lg'] as const;

    for (const size of sizes) {
      const { container } = render(
        <ButtonGroup size={size} aria-label={`${size} size group`}>
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with icon size buttons', async () => {
    const { container } = render(
      <ButtonGroup size="icon" aria-label="Toolbar">
        <Button aria-label="Bold">B</Button>
        <Button aria-label="Italic">I</Button>
        <Button aria-label="Underline">U</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with disabled buttons', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Actions">
        <Button>Enabled</Button>
        <Button disabled>Disabled</Button>
        <Button>Enabled</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all buttons disabled', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Disabled actions">
        <Button disabled>Save</Button>
        <Button disabled>Cancel</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with outline variant buttons', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Actions">
        <Button variant="outline">Cancel</Button>
        <Button variant="outline">Reset</Button>
        <Button variant="default">Save</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with ghost variant buttons', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Navigation tabs">
        <Button variant="ghost">Tab 1</Button>
        <Button variant="ghost">Tab 2</Button>
        <Button variant="ghost">Tab 3</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with destructive action', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Document actions">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="group" on container', () => {
    render(
      <ButtonGroup aria-label="Test group">
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has data-orientation attribute for styling and semantics', () => {
    const { rerender } = render(
      <ButtonGroup aria-label="Test">
        <Button>A</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'horizontal');

    rerender(
      <ButtonGroup orientation="vertical" aria-label="Test">
        <Button>A</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('supports aria-label for group identification', () => {
    render(
      <ButtonGroup aria-label="Pagination controls">
        <Button>Previous</Button>
        <Button>Next</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole('group', { name: 'Pagination controls' })).toBeInTheDocument();
  });

  it('supports aria-labelledby for external label', () => {
    render(
      <div>
        <h3 id="actions-heading">Document Actions</h3>
        <ButtonGroup aria-labelledby="actions-heading">
          <Button>Save</Button>
          <Button>Export</Button>
        </ButtonGroup>
      </div>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'actions-heading');
  });

  it('child buttons retain keyboard accessibility', () => {
    render(
      <ButtonGroup aria-label="Actions">
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    // All buttons should be focusable and have type="button"
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    }
  });

  it('has visible focus indicator classes on group', () => {
    render(
      <ButtonGroup aria-label="Test">
        <Button>A</Button>
      </ButtonGroup>,
    );

    // Group should have class for elevating focused children
    expect(screen.getByRole('group')).toHaveClass('[&>*:focus-visible]:z-10');
  });

  it('has no violations with single button', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Single action">
        <Button>Only Button</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with many buttons', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Pagination">
        <Button>1</Button>
        <Button>2</Button>
        <Button>3</Button>
        <Button>4</Button>
        <Button>5</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in form context', async () => {
    const { container } = render(
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
        <ButtonGroup aria-label="Form actions">
          <Button type="button">Cancel</Button>
          <Button type="submit">Submit</Button>
        </ButtonGroup>
      </form>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with secondary variant', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Options">
        <Button variant="secondary">Option A</Button>
        <Button variant="secondary">Option B</Button>
      </ButtonGroup>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
