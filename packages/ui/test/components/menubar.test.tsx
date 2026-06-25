/**
 * Menubar component tests
 * Tests SSR, hydration, interactions, and menu semantics
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../../src/components/ui/menubar';

afterEach(() => {
  cleanup();
});

describe('Menubar - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('File');
    expect(html).toContain('role="menubar"');
  });

  it('should render menu content closed (hidden) on server', () => {
    const html = renderToString(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Server Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    // In the controller model, content stays mounted but hidden (no portal unmount),
    // so it appears in the SSR output with the hidden attribute set.
    expect(html).toContain('Server Item');
    expect(html).toContain('hidden');
    expect(html).toContain('data-menubar-content');
  });
});

describe('Menubar - Client Hydration', () => {
  it('should hydrate and function on client', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByText('New')).not.toBeVisible();

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeVisible();
    });
  });
});

describe('Menubar - Basic Interactions', () => {
  it('should open menu when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByText('New')).not.toBeVisible();

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeVisible();
    });
  });

  it('should close menu when item is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New'));

    await waitFor(() => {
      expect(screen.getByText('New')).not.toBeVisible();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByText('New')).not.toBeVisible();
    });
  });

  it('should close when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarPortal>
              <MenubarContent>
                <MenubarItem>New</MenubarItem>
              </MenubarContent>
            </MenubarPortal>
          </MenubarMenu>
        </Menubar>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    fireEvent.pointerDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.getByText('New')).not.toBeVisible();
    });
  });

  it('should switch menus on hover when one is open', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New File</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    // Open first menu
    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    // Hover over second trigger
    await user.hover(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Undo')).toBeVisible();
      expect(screen.getByText('New File')).not.toBeVisible();
    });
  });
});

describe('Menubar - Keyboard Navigation', () => {
  it('should navigate items with arrow keys', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>First</MenubarItem>
              <MenubarItem>Second</MenubarItem>
              <MenubarItem>Third</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

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
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent loop>
              <MenubarItem>First</MenubarItem>
              <MenubarItem>Second</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Second')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('should open menu on ArrowDown from trigger', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    trigger.focus();

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  it('should activate item on Enter key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem onSelect={onSelect}>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toHaveFocus();
    });

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalled();
  });

  it('should activate item on Space key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem onSelect={onSelect}>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toHaveFocus();
    });

    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalled();
  });

  it('should navigate to Home and End', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>First</MenubarItem>
              <MenubarItem>Second</MenubarItem>
              <MenubarItem>Third</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    await user.keyboard('{End}');
    expect(screen.getByText('Third')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByText('First')).toHaveFocus();
  });
});

describe('Menubar - Multiple Menus', () => {
  it('should render multiple menu triggers', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Zoom</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should only have one menu open at a time', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>New File</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    // Open first menu
    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    // Open second menu
    await user.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Undo')).toBeVisible();
      expect(screen.getByText('New File')).not.toBeVisible();
    });
  });
});

describe('Menubar - Checkbox Items', () => {
  it('should toggle checkbox item', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    const CheckboxMenu = () => {
      const [checked, setChecked] = React.useState(false);

      return (
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarPortal>
              <MenubarContent>
                <MenubarCheckboxItem
                  checked={checked}
                  onCheckedChange={(newChecked) => {
                    setChecked(newChecked);
                    onCheckedChange(newChecked);
                  }}
                >
                  Show Toolbar
                </MenubarCheckboxItem>
              </MenubarContent>
            </MenubarPortal>
          </MenubarMenu>
        </Menubar>
      );
    };

    render(<CheckboxMenu />);

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByText('Show Toolbar'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('should show check indicator when checked', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarCheckboxItem checked>Checked Item</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'true');
      expect(item).toHaveAttribute('data-state', 'checked');
    });
  });
});

describe('Menubar - Radio Items', () => {
  it('should select radio item', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const RadioMenu = () => {
      const [value, setValue] = React.useState('');

      return (
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarPortal>
              <MenubarContent>
                <MenubarRadioGroup
                  value={value}
                  onValueChange={(newValue) => {
                    setValue(newValue);
                    onValueChange(newValue);
                  }}
                >
                  <MenubarRadioItem value="light">Light</MenubarRadioItem>
                  <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarContent>
            </MenubarPortal>
          </MenubarMenu>
        </Menubar>
      );
    };

    render(<RadioMenu />);

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('aria-checked', 'false');
      expect(items[1]).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByText('Light'));

    expect(onValueChange).toHaveBeenCalledWith('light');
  });

  it('should show radio indicator when selected', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarRadioGroup value="light">
                <MenubarRadioItem value="light">Light</MenubarRadioItem>
                <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('aria-checked', 'true');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('aria-checked', 'false');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });
});

describe('Menubar - Disabled Items', () => {
  it('should not activate disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem disabled onSelect={onSelect}>
                Disabled Item
              </MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Disabled Item'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should have correct aria-disabled attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem disabled>Disabled</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const item = screen.getByText('Disabled');
      expect(item).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

describe('Menubar - Labels and Separators', () => {
  it('should render label', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarLabel>Section Label</MenubarLabel>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('Section Label')).toBeInTheDocument();
    });
  });

  it('should render separator', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item 1</MenubarItem>
              <MenubarSeparator data-testid="separator" />
              <MenubarItem>Item 2</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const separator = screen.getByTestId('separator');
      expect(separator).toBeInTheDocument();
      expect(separator.tagName).toBe('HR');
    });
  });

  it('should render shortcut', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>
                Save
                <MenubarShortcut>Cmd+S</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('Cmd+S')).toBeInTheDocument();
    });
  });
});

describe('Menubar - Groups', () => {
  it('should render group', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem>Item 1</MenubarItem>
                <MenubarItem>Item 2</MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
    });
  });
});

describe('Menubar - ARIA Attributes', () => {
  it('should have role="menubar" on root', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByRole('menubar')).toBeInTheDocument();
  });

  it('should have role="menu" on content', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('should have role="menuitem" on items', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item 1</MenubarItem>
              <MenubarItem>Item 2</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      // Trigger also has role="menuitem" in menubar context
      const items = screen.getAllByRole('menuitem');
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('trigger should have aria-haspopup="menu"', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('trigger should have aria-expanded attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger should have aria-controls pointing to menu', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    await user.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('id', controlsId);
    });
  });
});

describe('Menubar - Submenus', () => {
  it('should render submenu trigger', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
    });
  });

  it('should open submenu on hover', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    expect(screen.queryByText('Email')).not.toBeInTheDocument();

    await user.hover(screen.getByText('Share'));

    await waitFor(
      () => {
        expect(screen.getByText('Email')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('submenu trigger should have aria-haspopup="menu"', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const subTrigger = screen.getByText('Share');
      expect(subTrigger).toHaveAttribute('aria-haspopup', 'menu');
    });
  });
});

describe('Menubar - Focus Return', () => {
  it('should return focus to trigger on close', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByText('Item')).not.toBeVisible();
      expect(trigger).toHaveFocus();
    });
  });
});

describe('Menubar - Inset', () => {
  it('should apply inset class to label', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarLabel inset>Inset Label</MenubarLabel>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const label = screen.getByText('Inset Label');
      expect(label).toHaveClass('pl-8');
    });
  });

  it('should apply inset class to item', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem inset>Inset Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const item = screen.getByText('Inset Item');
      expect(item).toHaveClass('pl-8');
    });
  });
});

describe('Menubar - Namespaced API', () => {
  it('should work with namespaced components', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <Menubar.Menu>
          <Menubar.Trigger>File</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content>
              <Menubar.Item>New</Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });
});
