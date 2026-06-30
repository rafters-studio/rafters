/**
 * DropdownMenu component tests
 * Tests SSR, hydration, interactions, and menu semantics
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../src/components/ui/dropdown-menu';

describe('DropdownMenu - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open Menu');
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Server Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    expect(html).not.toContain('Server Item');
  });
});

describe('DropdownMenu - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Hydrated Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Item')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    rerender(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    expect(screen.getByText('Item')).toBeInTheDocument();
  });
});

describe('DropdownMenu - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    await user.click(screen.getByText('Open Menu'));

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('should close when item is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
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
});

describe('DropdownMenu - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledMenu = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <DropdownMenu
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <DropdownMenuItem>Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      );
    };

    render(<ControlledMenu />);

    expect(screen.queryByText('Item')).not.toBeInTheDocument();

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    await user.click(screen.getByText('Item'));

    await waitFor(() => {
      expect(screen.queryByText('Item')).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('DropdownMenu - Keyboard Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should navigate with arrow keys', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem>Second</DropdownMenuItem>
            <DropdownMenuItem>Third</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent loop>
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem>Second</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onSelect}>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onSelect}>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem>Second</DropdownMenuItem>
            <DropdownMenuItem>Third</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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

describe('DropdownMenu - Checkbox Items', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should toggle checkbox item', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    const CheckboxMenu = () => {
      const [checked, setChecked] = React.useState(false);

      return (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={checked}
                onCheckedChange={(newChecked) => {
                  setChecked(newChecked);
                  onCheckedChange(newChecked);
                }}
              >
                Toggle Me
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>Checked Item</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'true');
      expect(item).toHaveAttribute('data-state', 'checked');
    });
  });
});

describe('DropdownMenu - Radio Items', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should select radio item', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const RadioMenu = () => {
      const [value, setValue] = React.useState('');

      return (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup
                value={value}
                onValueChange={(newValue) => {
                  setValue(newValue);
                  onValueChange(newValue);
                }}
              >
                <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="a">
              <DropdownMenuRadioItem value="a">Selected</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Not Selected</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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

describe('DropdownMenu - Disabled Items', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should not activate disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem disabled onSelect={onSelect}>
              Disabled Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Disabled Item'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should have correct aria-disabled attribute', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

describe('DropdownMenu - Labels and Separators', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render label', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuLabel>Section Label</DropdownMenuLabel>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Section Label')).toBeInTheDocument();
    });
  });

  it('should render separator', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid="separator" />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
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
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>Cmd+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('Cmd+S')).toBeInTheDocument();
    });
  });
});

describe('DropdownMenu - Groups', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render group', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
              <DropdownMenuItem>Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
    });
  });
});

describe('DropdownMenu - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have correct role="menu" on content', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('should have correct role="menuitem" on items', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(2);
    });
  });

  it('trigger should have aria-haspopup="menu"', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('trigger should have aria-expanded attribute', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger should have aria-controls pointing to menu', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    await user.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('id', controlsId);
    });
  });
});

describe('DropdownMenu - Submenus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render submenu trigger', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('More Options')).toBeInTheDocument();
    });
  });

  it('should open submenu on hover', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    expect(screen.queryByText('Sub Item')).not.toBeInTheDocument();

    await user.hover(screen.getByText('More'));

    await waitFor(
      () => {
        expect(screen.getByText('Sub Item')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should keep root open when a nested submenu opens (independent state)', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Root Item</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    expect(screen.queryByText('Sub Item')).not.toBeInTheDocument();

    await user.hover(screen.getByText('More'));

    await waitFor(
      () => {
        expect(screen.getByText('Sub Item')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Opening the submenu does not collapse the root menu.
    expect(screen.getByText('Root Item')).toBeInTheDocument();
  });

  it('submenu trigger should have aria-haspopup="menu"', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const subTrigger = screen.getByText('More');
      expect(subTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });
  });
});

describe('DropdownMenu - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <a href="#menu">Custom Trigger</a>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    const trigger = screen.getByText('Custom Trigger');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#menu');

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });
  });
});

describe('DropdownMenu - Focus Return', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return focus to trigger on close', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Item')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});

describe('DropdownMenu - Inset', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should apply inset class to label', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const label = screen.getByText('Inset Label');
      expect(label).toHaveClass('pl-8');
    });
  });

  it('should apply inset class to item', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    await waitFor(() => {
      const item = screen.getByText('Inset Item');
      expect(item).toHaveClass('pl-8');
    });
  });
});
