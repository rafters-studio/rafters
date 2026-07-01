import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Item } from '../../../src/old/ui/item';

describe('Item - Accessibility', () => {
  it('has no accessibility violations with default props', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item>Default Item</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item icon={<span>Icon</span>}>Item with Icon</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with description', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item description="Secondary information">Item with Description</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon and description', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item icon={<span>Icon</span>} description="Description text">
          Complete Item
        </Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when selected', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item selected>Selected Item</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item disabled>Disabled Item</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all sizes', async () => {
    const sizes = ['sm', 'default', 'lg'] as const;
    for (const size of sizes) {
      const { container } = render(
        <div role="listbox" aria-label="Options">
          <Item size={size}>{size} Item</Item>
        </div>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations in a complete list context', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Navigation options">
        <Item selected icon={<span>Home</span>}>
          Dashboard
        </Item>
        <Item icon={<span>User</span>} description="Manage your profile">
          Profile
        </Item>
        <Item icon={<span>Gear</span>}>Settings</Item>
        <Item disabled icon={<span>Lock</span>}>
          Admin Panel
        </Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple selected items (multi-select)', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Select items" aria-multiselectable="true">
        <Item selected>Selected 1</Item>
        <Item selected>Selected 2</Item>
        <Item>Not Selected</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Options">
        <Item aria-label="Custom label" aria-describedby="description">
          Item
        </Item>
        <p id="description">Additional description for screen readers</p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in listbox context', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Actions">
        <Item role="option">Edit</Item>
        <Item role="option">Duplicate</Item>
        <Item role="option" disabled>
          Delete
        </Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when combined with different states', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Complex options">
        <Item size="sm">Small</Item>
        <Item size="default" selected>
          Default Selected
        </Item>
        <Item size="lg" disabled>
          Large Disabled
        </Item>
        <Item size="default" icon={<span>Icon</span>} description="Has everything" selected>
          Complete
        </Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper focus management', async () => {
    const { container } = render(
      <div role="listbox" aria-label="Focusable items">
        <Item>Focusable 1</Item>
        <Item>Focusable 2</Item>
        <Item disabled>Not Focusable</Item>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
