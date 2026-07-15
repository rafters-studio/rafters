/**
 * Menubar component accessibility tests
 * Tests ARIA attributes, focus management, and keyboard navigation
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
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
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../../../src/old/ui/menubar';

afterEach(() => {
  cleanup();
});

describe('Menubar - Accessibility', () => {
  it('has no accessibility violations when closed', async () => {
    const { container } = render(
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
      </Menubar>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarLabel>Actions</MenubarLabel>
              <MenubarItem>New File</MenubarItem>
              <MenubarItem>Save</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Exit</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with checkbox items', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show Toolbar</MenubarCheckboxItem>
              <MenubarCheckboxItem>Show Sidebar</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with radio items', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarRadioGroup value="light">
                <MenubarRadioItem value="light">Light</MenubarRadioItem>
                <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                <MenubarRadioItem value="system">System</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('Theme'));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="menubar" on root', () => {
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

  it('has correct role="menu" on content', async () => {
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

  it('has correct role="menuitem" on items', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem>First Item</MenubarItem>
              <MenubarItem>Second Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const items = screen.getAllByRole('menuitem');
      // Includes trigger (which has role="menuitem" in menubar) plus the two items
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('has correct role="menuitemcheckbox" on checkbox items', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarCheckboxItem checked>Checked</MenubarCheckboxItem>
              <MenubarCheckboxItem>Unchecked</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const checkboxItems = screen.getAllByRole('menuitemcheckbox');
      expect(checkboxItems).toHaveLength(2);
    });
  });

  it('has correct role="menuitemradio" on radio items', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarRadioGroup value="a">
                <MenubarRadioItem value="a">Option A</MenubarRadioItem>
                <MenubarRadioItem value="b">Option B</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('Theme'));

    await waitFor(() => {
      const radioItems = screen.getAllByRole('menuitemradio');
      expect(radioItems).toHaveLength(2);
    });
  });

  it('checkbox items have correct aria-checked attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarCheckboxItem checked>Checked</MenubarCheckboxItem>
              <MenubarCheckboxItem>Unchecked</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const checkboxItems = screen.getAllByRole('menuitemcheckbox');
      expect(checkboxItems[0]).toHaveAttribute('aria-checked', 'true');
      expect(checkboxItems[1]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('radio items have correct aria-checked attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarRadioGroup value="a">
                <MenubarRadioItem value="a">Selected</MenubarRadioItem>
                <MenubarRadioItem value="b">Not Selected</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('Theme'));

    await waitFor(() => {
      const radioItems = screen.getAllByRole('menuitemradio');
      expect(radioItems[0]).toHaveAttribute('aria-checked', 'true');
      expect(radioItems[1]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('trigger has aria-haspopup="menu"', () => {
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

  it('trigger has correct aria-expanded attribute', async () => {
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

  it('trigger has aria-controls pointing to menu', async () => {
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

  it('disabled items have aria-disabled="true"', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarItem disabled>Disabled Item</MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('File'));

    await waitFor(() => {
      const item = screen.getByText('Disabled Item');
      expect(item).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('separator renders as hr element', async () => {
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
      expect(separator.tagName).toBe('HR');
    });
  });

  it('group has role="group"', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem>Item</MenubarItem>
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

  it('focuses first item when menu opens', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
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
  });

  it('supports arrow key navigation', async () => {
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

  it('supports Home and End key navigation', async () => {
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

  it('activates item on Enter key', async () => {
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

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('returns focus to trigger on close', async () => {
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
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('has data-state attribute for open/closed states', async () => {
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
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('data-state', 'open');
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });

  it('checkbox items have data-state attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarCheckboxItem checked>Checked</MenubarCheckboxItem>
              <MenubarCheckboxItem>Unchecked</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('View'));

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemcheckbox');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });

  it('radio items have data-state attribute', async () => {
    const user = userEvent.setup();

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarRadioGroup value="a">
                <MenubarRadioItem value="a">Selected</MenubarRadioItem>
                <MenubarRadioItem value="b">Not Selected</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByText('Theme'));

    await waitFor(() => {
      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('data-state', 'checked');
      expect(items[1]).toHaveAttribute('data-state', 'unchecked');
    });
  });

  it('submenu trigger has aria-haspopup="menu"', async () => {
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

  it('submenu trigger has aria-expanded attribute', async () => {
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
      expect(subTrigger).toHaveAttribute('aria-expanded', 'false');
    });

    await user.hover(screen.getByText('Share'));

    await waitFor(
      () => {
        const subTrigger = screen.getByText('Share');
        expect(subTrigger).toHaveAttribute('aria-expanded', 'true');
      },
      { timeout: 500 },
    );
  });

  it('menu has aria-orientation="vertical"', async () => {
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
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    });
  });
});
