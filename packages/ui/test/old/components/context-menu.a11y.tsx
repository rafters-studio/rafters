/**
 * ContextMenu component accessibility tests
 * Tests ARIA attributes, focus management, and keyboard navigation
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../src/old/ui/context-menu';

// Clear portals between tests
beforeEach(() => {
  const portals = document.querySelectorAll('[data-radix-portal], [data-portal]');
  for (const portal of portals) {
    portal.remove();
  }
});

describe('ContextMenu - Accessibility', () => {
  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click area</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem>New File</ContextMenuItem>
            <ContextMenuItem>Save</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Exit</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click area</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with checkbox items', async () => {
    const { container } = render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Options</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Show Toolbar</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Show Sidebar</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with radio items', async () => {
    const { container } = render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Theme</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="light">
              <ContextMenuRadioItem value="light">Light</ContextMenuRadioItem>
              <ContextMenuRadioItem value="dark">Dark</ContextMenuRadioItem>
              <ContextMenuRadioItem value="system">System</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="menu" on content', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('has correct role="menuitem" on items', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>First Item</ContextMenuItem>
            <ContextMenuItem>Second Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(2);
    });
  });

  it('has correct role="menuitemcheckbox" on checkbox items', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Checked</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Unchecked</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const checkboxItems = screen.getAllByRole('menuitemcheckbox');
      expect(checkboxItems).toHaveLength(2);
    });
  });

  it('has correct role="menuitemradio" on radio items', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="a">
              <ContextMenuRadioItem value="a">Option A</ContextMenuRadioItem>
              <ContextMenuRadioItem value="b">Option B</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const radioItems = screen.getAllByRole('menuitemradio');
      expect(radioItems).toHaveLength(2);
    });
  });

  it('checkbox items have correct aria-checked attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Checked</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Unchecked</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const checkboxItems = screen.getAllByRole('menuitemcheckbox');
      expect(checkboxItems[0]).toHaveAttribute('aria-checked', 'true');
      expect(checkboxItems[1]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('radio items have correct aria-checked attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="a">
              <ContextMenuRadioItem value="a">Selected</ContextMenuRadioItem>
              <ContextMenuRadioItem value="b">Not Selected</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const radioItems = screen.getAllByRole('menuitemradio');
      expect(radioItems[0]).toHaveAttribute('aria-checked', 'true');
      expect(radioItems[1]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('disabled items have aria-disabled="true"', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem disabled>Disabled Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('separator renders as hr element', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuSeparator data-testid="separator" />
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const separator = screen.getByTestId('separator');
      expect(separator.tagName).toBe('HR');
    });
  });

  it('group has role="group"', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
    });
  });

  it('focuses first item when menu opens', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });
  });

  it('supports arrow key navigation', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
            <ContextMenuItem>Third</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Second')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Third')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByText('Second')).toHaveFocus();
  });

  it('supports Home and End key navigation', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
            <ContextMenuItem>Third</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    await user.keyboard('{End}');
    expect(screen.getByText('Third')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('activates item on Enter key', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item')).toHaveFocus();
    });

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('activates item on Space key', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item')).toHaveFocus();
    });

    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('has data-state attribute for open/closed states', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('data-state', 'open');
    });
  });

  it('checkbox items have data-state attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Checked</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Unchecked</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemcheckbox');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });

  it('radio items have data-state attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="a">
              <ContextMenuRadioItem value="a">Selected</ContextMenuRadioItem>
              <ContextMenuRadioItem value="b">Not Selected</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });

  it('submenu trigger has aria-haspopup="menu"', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const subTrigger = screen.getByText('More');
      expect(subTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  it('submenu trigger has aria-expanded attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More Closed</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub Item Closed</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub defaultOpen>
              <ContextMenuSubTrigger>More Open</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub Item Open</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    // Test closed submenu trigger
    await waitFor(() => {
      const closedTrigger = screen.getByText('More Closed');
      expect(closedTrigger).toHaveAttribute('aria-expanded', 'false');
    });

    // Test open submenu trigger
    await waitFor(() => {
      const openTrigger = screen.getByText('More Open');
      expect(openTrigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('menu has aria-orientation="vertical"', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    });
  });
});
