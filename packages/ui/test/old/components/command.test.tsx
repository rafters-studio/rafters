import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../../../src/old/ui/command';

const TestCommand = ({
  value,
  onValueChange,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
}) => (
  <Command value={value} onValueChange={onValueChange} data-testid="command">
    <CommandInput placeholder="Type a command..." data-testid="input" />
    <CommandList data-testid="list">
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions" data-testid="group">
        <CommandItem value="calendar" data-testid="item-calendar">
          Calendar
          <CommandShortcut data-testid="shortcut">Cmd+C</CommandShortcut>
        </CommandItem>
        <CommandItem value="search" data-testid="item-search">
          Search
        </CommandItem>
        <CommandSeparator data-testid="separator" />
        <CommandItem value="settings" disabled data-testid="item-settings">
          Settings
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

describe('Command - Basic Rendering', () => {
  it('should render command with input and list', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('command')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('list')).toBeInTheDocument();
  });

  it('should render group with heading', () => {
    render(<TestCommand />);

    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByTestId('group')).toBeInTheDocument();
  });

  it('should render items', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('item-calendar')).toHaveTextContent('Calendar');
    expect(screen.getByTestId('item-search')).toHaveTextContent('Search');
  });

  it('should render with namespaced components', () => {
    render(
      <Command data-testid="command">
        <Command.Input placeholder="Search..." data-testid="input" />
        <Command.List data-testid="list">
          <Command.Empty>No results.</Command.Empty>
          <Command.Group heading="Actions">
            <Command.Item value="action1">
              Action 1<Command.Shortcut>Cmd+1</Command.Shortcut>
            </Command.Item>
            <Command.Separator />
            <Command.Item value="action2">Action 2</Command.Item>
          </Command.Group>
        </Command.List>
      </Command>,
    );

    expect(screen.getByTestId('command')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('list')).toBeInTheDocument();
  });
});

describe('Command - ARIA Attributes', () => {
  it('should have combobox role on input', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('input')).toHaveAttribute('role', 'combobox');
  });

  it('should have aria-autocomplete list', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('input')).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('should have listbox role on list', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('list')).toHaveAttribute('role', 'listbox');
  });

  it('should have option role on items', () => {
    render(<TestCommand />);

    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('should have group role on groups', () => {
    render(<TestCommand />);

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('should have aria-labelledby for group with heading', () => {
    render(<TestCommand />);

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby');
  });
});

describe('Command - Search Filtering', () => {
  it('should call onValueChange when typing', () => {
    const handleValueChange = vi.fn();
    render(<TestCommand onValueChange={handleValueChange} />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'cal' } });

    expect(handleValueChange).toHaveBeenCalledWith('cal');
  });

  it('should filter items based on search', () => {
    render(<TestCommand value="cal" />);

    // Only Calendar should be visible
    expect(screen.getByTestId('item-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('item-search')).not.toBeInTheDocument();
  });

  it('should show empty state when no matches', () => {
    render(<TestCommand value="xyz" />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('should not show empty state when matches exist', () => {
    render(<TestCommand value="cal" />);

    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
  });
});

describe('Command - Keyboard Navigation', () => {
  it('should navigate down with ArrowDown', () => {
    render(<TestCommand />);

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const calendarItem = screen.getByTestId('item-calendar');
    expect(calendarItem).toHaveAttribute('data-selected', 'true');
  });

  it('should navigate up with ArrowUp', () => {
    render(<TestCommand />);

    const input = screen.getByTestId('input');

    // Navigate down twice, then up once
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const calendarItem = screen.getByTestId('item-calendar');
    expect(calendarItem).toHaveAttribute('data-selected', 'true');
  });

  it('should navigate to first with Home', () => {
    render(<TestCommand />);

    const input = screen.getByTestId('input');

    // Navigate down twice, then Home
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Home' });

    const calendarItem = screen.getByTestId('item-calendar');
    expect(calendarItem).toHaveAttribute('data-selected', 'true');
  });

  it('should navigate to last with End', () => {
    render(<TestCommand />);

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'End' });

    // Settings is disabled so not registered - search is the last enabled item
    const searchItem = screen.getByTestId('item-search');
    expect(searchItem).toHaveAttribute('data-selected', 'true');
  });
});

describe('Command - Selection', () => {
  it('should call onSelect when item clicked', () => {
    const handleSelect = vi.fn();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test" onSelect={handleSelect}>
            Test
          </CommandItem>
        </CommandList>
      </Command>,
    );

    fireEvent.click(screen.getByText('Test'));

    expect(handleSelect).toHaveBeenCalledWith('test');
  });

  it('should not select disabled items', () => {
    const handleSelect = vi.fn();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test" disabled onSelect={handleSelect}>
            Test
          </CommandItem>
        </CommandList>
      </Command>,
    );

    fireEvent.click(screen.getByText('Test'));

    expect(handleSelect).not.toHaveBeenCalled();
  });
});

describe('Command - Mouse Interaction', () => {
  it('should highlight item on mouse enter', () => {
    render(<TestCommand />);

    const searchItem = screen.getByTestId('item-search');
    fireEvent.mouseEnter(searchItem);

    expect(searchItem).toHaveAttribute('data-selected', 'true');
  });
});

describe('Command - Disabled State', () => {
  it('should mark disabled items', () => {
    render(<TestCommand />);

    const settingsItem = screen.getByTestId('item-settings');
    expect(settingsItem).toHaveAttribute('aria-disabled', 'true');
    expect(settingsItem).toHaveAttribute('data-disabled', 'true');
  });
});

describe('Command - Separator', () => {
  it('should render separator', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('separator')).toBeInTheDocument();
    expect(screen.getByTestId('separator')).toHaveAttribute('data-command-separator');
  });
});

describe('Command - Shortcut', () => {
  it('should render shortcut', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('shortcut')).toHaveTextContent('Cmd+C');
    expect(screen.getByTestId('shortcut')).toHaveAttribute('data-command-shortcut');
  });
});

describe('Command - Dialog', () => {
  it('should not render when closed', () => {
    render(
      <CommandDialog open={false} data-testid="dialog">
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <CommandDialog open data-testid="dialog">
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('should call onOpenChange when escape pressed', () => {
    const handleOpenChange = vi.fn();
    render(
      <CommandDialog open onOpenChange={handleOpenChange}>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange when backdrop clicked', () => {
    const handleOpenChange = vi.fn();
    render(
      <CommandDialog open onOpenChange={handleOpenChange}>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    // Click the backdrop (first child with inset-0 class)
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Command - Data Attributes', () => {
  it('should set data-command on root', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('command')).toHaveAttribute('data-command');
  });

  it('should set data-command-input on input', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('input')).toHaveAttribute('data-command-input');
  });

  it('should set data-command-list on list', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('list')).toHaveAttribute('data-command-list');
  });

  it('should set data-command-group on groups', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('group')).toHaveAttribute('data-command-group');
  });

  it('should set data-command-item on items', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('item-calendar')).toHaveAttribute('data-command-item');
  });

  it('should set data-value on items', () => {
    render(<TestCommand />);

    expect(screen.getByTestId('item-calendar')).toHaveAttribute('data-value', 'calendar');
  });
});

describe('Command - Custom className', () => {
  it('should merge custom className on command', () => {
    render(
      <Command className="custom-command" data-testid="command">
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>,
    );

    expect(screen.getByTestId('command').className).toContain('custom-command');
  });

  it('should merge custom className on input', () => {
    render(
      <Command>
        <CommandInput className="custom-input" data-testid="input" />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>,
    );

    expect(screen.getByTestId('input').className).toContain('custom-input');
  });

  it('should merge custom className on list', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList className="custom-list" data-testid="list">
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>,
    );

    expect(screen.getByTestId('list').className).toContain('custom-list');
  });

  it('should merge custom className on item', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test" className="custom-item" data-testid="item">
            Test
          </CommandItem>
        </CommandList>
      </Command>,
    );

    expect(screen.getByTestId('item').className).toContain('custom-item');
  });
});

describe('Command - Input Search Icon', () => {
  it('should render search icon', () => {
    render(<TestCommand />);

    const inputWrapper = document.querySelector('[data-command-input-wrapper]');
    expect(inputWrapper?.querySelector('svg')).toBeInTheDocument();
  });
});
