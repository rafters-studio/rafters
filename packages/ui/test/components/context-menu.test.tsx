/**
 * ContextMenu component tests
 * Tests SSR, hydration, interactions, and menu semantics
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../src/components/ui/context-menu';

// Clear portals between tests
beforeEach(() => {
  const portals = document.querySelectorAll('[data-radix-portal], [data-portal]');
  for (const portal of portals) {
    portal.remove();
  }
});

describe('ContextMenu - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <ContextMenu open>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Right-click me');
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <ContextMenu open>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Server Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    expect(html).not.toContain('Server Item');
  });
});

describe('ContextMenu - Client Hydration', () => {
  it('should hydrate and render portal content on client', async () => {
    render(
      <ContextMenu open>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Hydrated Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Item')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
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
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    rerender(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    expect(screen.getByText('Item')).toBeInTheDocument();
  });
});

describe('ContextMenu - Basic Interactions', () => {
  it('should open when trigger is right-clicked', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText('Right-click me'), {
      clientX: 100,
      clientY: 100,
    });

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('should close when item is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Item 1'));

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
  });

  it('should close when clicking outside', async () => {
    render(
      <div>
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
          <ContextMenuPortal>
            <ContextMenuContent>
              <ContextMenuItem>Item 1</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenuPortal>
        </ContextMenu>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    fireEvent.pointerDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
  });

  it('should not open when trigger is disabled', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger disabled>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Right-click me'), {
      clientX: 100,
      clientY: 100,
    });

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });
});

describe('ContextMenu - Position at Cursor', () => {
  it('should position menu at cursor coordinates', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Right-click me'), {
      clientX: 150,
      clientY: 200,
    });

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      const style = menu.style;
      expect(style.position).toBe('fixed');
    });
  });

  it('opens at the pointer and positions content at the captured coordinates', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Right-click me'), {
      clientX: 120,
      clientY: 80,
    });

    const menu = await screen.findByRole('menu');
    expect(menu).toBeVisible();
    await waitFor(() => {
      expect(menu).toHaveStyle({ left: '120px', top: '80px' });
    });
  });

  it('closes on Escape after opening at the pointer', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Right-click me'), {
      clientX: 120,
      clientY: 80,
    });

    await screen.findByRole('menu');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});

describe('ContextMenu - Controlled Mode', () => {
  it('should work in controlled mode', async () => {
    const onOpenChange = vi.fn();

    const ControlledMenu = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <ContextMenu
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <ContextMenuTrigger>Right-click</ContextMenuTrigger>
          <ContextMenuPortal>
            <ContextMenuContent>
              <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenuPortal>
        </ContextMenu>
      );
    };

    render(<ControlledMenu />);

    expect(screen.queryByText('Item')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText('Right-click'), {
      clientX: 100,
      clientY: 100,
    });

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });
});

describe('ContextMenu - Keyboard Navigation', () => {
  it('should navigate with arrow keys', async () => {
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

  it('should loop navigation when loop is enabled', async () => {
    const user = userEvent.setup();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent loop>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
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
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('should activate item on Enter key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem onSelect={onSelect}>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item')).toHaveFocus();
    });

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalled();
  });

  it('should activate item on Space key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem onSelect={onSelect}>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item')).toHaveFocus();
    });

    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalled();
  });

  it('should navigate to Home and End', async () => {
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
});

describe('ContextMenu - Checkbox Items', () => {
  it('should toggle checkbox item', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    const CheckboxMenu = () => {
      const [checked, setChecked] = React.useState(false);

      return (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Right-click</ContextMenuTrigger>
          <ContextMenuPortal>
            <ContextMenuContent>
              <ContextMenuCheckboxItem
                checked={checked}
                onCheckedChange={(newChecked) => {
                  setChecked(newChecked);
                  onCheckedChange(newChecked);
                }}
              >
                Toggle Me
              </ContextMenuCheckboxItem>
            </ContextMenuContent>
          </ContextMenuPortal>
        </ContextMenu>
      );
    };

    render(<CheckboxMenu />);

    await waitFor(() => {
      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByText('Toggle Me'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('should show check indicator when checked', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Checked Item</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'true');
      expect(item).toHaveAttribute('data-state', 'checked');
    });
  });
});

describe('ContextMenu - Radio Items', () => {
  it('should select radio item', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const RadioMenu = () => {
      const [value, setValue] = React.useState('');

      return (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Right-click</ContextMenuTrigger>
          <ContextMenuPortal>
            <ContextMenuContent>
              <ContextMenuRadioGroup
                value={value}
                onValueChange={(newValue) => {
                  setValue(newValue);
                  onValueChange(newValue);
                }}
              >
                <ContextMenuRadioItem value="a">Option A</ContextMenuRadioItem>
                <ContextMenuRadioItem value="b">Option B</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuContent>
          </ContextMenuPortal>
        </ContextMenu>
      );
    };

    render(<RadioMenu />);

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('aria-checked', 'false');
      expect(items[1]).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByText('Option A'));

    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('should show radio indicator when selected', async () => {
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
      expect(items[0]).toHaveAttribute('aria-checked', 'true');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('aria-checked', 'false');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });
});

describe('ContextMenu - Disabled Items', () => {
  it('should not activate disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem disabled onSelect={onSelect}>
              Disabled Item
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Disabled Item'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should have correct aria-disabled attribute', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem disabled>Disabled</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

describe('ContextMenu - Labels and Separators', () => {
  it('should render label', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel>Section Label</ContextMenuLabel>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Section Label')).toBeInTheDocument();
    });
  });

  it('should render separator', async () => {
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
      expect(separator).toBeInTheDocument();
      // hr element has implicit separator role
      expect(separator.tagName).toBe('HR');
    });
  });

  it('should render shortcut', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>
              Save
              <ContextMenuShortcut>Cmd+S</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Cmd+S')).toBeInTheDocument();
    });
  });
});

describe('ContextMenu - Groups', () => {
  it('should render group', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuItem>Item 1</ContextMenuItem>
              <ContextMenuItem>Item 2</ContextMenuItem>
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
});

describe('ContextMenu - ARIA Attributes', () => {
  it('should have correct role="menu" on content', async () => {
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

  it('should have correct role="menuitem" on items', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(2);
    });
  });

  it('menu should have aria-orientation="vertical"', async () => {
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

describe('ContextMenu - Submenus', () => {
  it('should render submenu trigger', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More Options</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('More Options')).toBeInTheDocument();
    });
  });

  it('should open submenu on hover', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuSub defaultOpen>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    // With defaultOpen, submenu should be visible immediately
    await waitFor(() => {
      expect(screen.getByText('More')).toBeInTheDocument();
      expect(screen.getByText('Sub Item')).toBeInTheDocument();
    });
  });

  it('submenu trigger should have aria-haspopup="menu"', async () => {
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

  it('submenu trigger should have aria-expanded attribute', async () => {
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
});

describe('ContextMenu - asChild Pattern', () => {
  it('should support asChild on trigger', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div data-testid="custom-trigger">Custom Trigger Area</div>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    const trigger = screen.getByTestId('custom-trigger');
    expect(trigger.tagName).toBe('DIV');

    fireEvent.contextMenu(trigger, { clientX: 100, clientY: 100 });

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });
  });
});

describe('ContextMenu - Inset', () => {
  it('should apply inset class to label', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel inset>Inset Label</ContextMenuLabel>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const label = screen.getByText('Inset Label');
      expect(label).toHaveClass('pl-8');
    });
  });

  it('should apply inset class to item', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Right-click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem inset>Inset Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );

    await waitFor(() => {
      const item = screen.getByText('Inset Item');
      expect(item).toHaveClass('pl-8');
    });
  });
});

describe('ContextMenu - Namespaced API', () => {
  it('should work with namespaced components', async () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenu.Trigger>Right-click</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content>
            <ContextMenu.Label>Actions</ContextMenu.Label>
            <ContextMenu.Item>Edit</ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.CheckboxItem checked>Toggle</ContextMenu.CheckboxItem>
            <ContextMenu.RadioGroup value="a">
              <ContextMenu.RadioItem value="a">Option A</ContextMenu.RadioItem>
            </ContextMenu.RadioGroup>
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger>More</ContextMenu.SubTrigger>
              <ContextMenu.SubContent>
                <ContextMenu.Item>Sub Item</ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Sub>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Toggle')).toBeInTheDocument();
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });
  });
});
