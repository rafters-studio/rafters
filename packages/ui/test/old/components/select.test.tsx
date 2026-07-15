/**
 * Select component tests
 * Tests SSR, hydration, interactions, and keyboard navigation
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectIcon,
  SelectItem,
  SelectLabel,
  SelectPortal,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../../src/old/ui/select';

describe('Select - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Select a fruit');
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Server Content</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    expect(html).not.toContain('Server Content');
  });
});

describe('Select - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Hydrated Content</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });
});

describe('Select - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    expect(screen.queryByText('Apple')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });
  });

  it('should select item on click', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple'));

    expect(onValueChange).toHaveBeenCalledWith('apple');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should close on outside click', async () => {
    render(
      <div>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </SelectPortal>
        </Select>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.pointerDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});

describe('Select - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode for value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function ControlledSelect() {
      const [value, setValue] = React.useState('');

      return (
        <Select
          value={value}
          onValueChange={(newValue) => {
            setValue(newValue);
            onValueChange(newValue);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectContent>
          </SelectPortal>
        </Select>
      );
    }

    render(<ControlledSelect />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Banana'));

    expect(onValueChange).toHaveBeenCalledWith('banana');
  });

  it('should work in controlled mode for open state', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function ControlledOpenSelect() {
      const [open, setOpen] = React.useState(false);

      return (
        <Select
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </SelectPortal>
        </Select>
      );
    }

    render(<ControlledOpenSelect />);

    await user.click(screen.getByRole('combobox'));

    expect(onOpenChange).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});

describe('Select - Keyboard Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open on ArrowDown', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('should open on Enter', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    screen.getByRole('combobox').focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('should open on Space', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    screen.getByRole('combobox').focus();
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('should navigate items with arrow keys', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    // First item should be focused initially
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Navigate down
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });

    // Navigate down again
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });

    // Navigate up
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });
  });

  it('should wrap navigation with loop', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Navigate to last item
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });

    // Wrap to first
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });
  });

  it('should select on Enter key', async () => {
    const onValueChange = vi.fn();

    render(
      <Select defaultOpen onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Navigate to Banana
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });

    // Select with Enter
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('banana');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should support Home and End keys', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // End goes to last
    fireEvent.keyDown(listbox, { key: 'End' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });

    // Home goes to first
    fireEvent.keyDown(listbox, { key: 'Home' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });
  });
});

describe('Select - Disabled State', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should not open when disabled', async () => {
    const user = userEvent.setup();

    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();

    await user.click(trigger);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should skip disabled items in navigation', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana" disabled>
              Banana
            </SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const listbox = screen.getByRole('listbox');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Should skip disabled Banana and go to Cherry
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });
  });

  it('should not select disabled item on click', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana" disabled>
              Banana
            </SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Banana'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Select - Groups and Labels', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render groups with labels', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
            </SelectGroup>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Carrot')).toBeInTheDocument();
    });

    // Check groups are rendered
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
  });
});

describe('Select - Default Value', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should show default value', () => {
    render(
      <Select defaultValue="banana">
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    // SelectValue shows the value, not the label by default
    // This is consistent with how controlled components work
    expect(screen.getByRole('combobox')).toHaveTextContent('banana');
  });

  it('should focus selected item when opening', async () => {
    const user = userEvent.setup();

    render(
      <Select defaultValue="banana">
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Selected item should be focused
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });
  });
});

describe('Select - Data Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have correct data-state on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });

  it('should have correct aria-selected on items', async () => {
    const user = userEvent.setup();

    render(
      <Select defaultValue="banana">
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Select - Custom Styling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should merge custom className', async () => {
    const user = userEvent.setup();

    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent className="custom-content">
            <SelectItem value="test" className="custom-item">
              Test
            </SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    expect(screen.getByRole('combobox')).toHaveClass('custom-trigger');

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toHaveClass('custom-content');
      expect(screen.getByRole('option')).toHaveClass('custom-item');
    });
  });
});

describe('Select - Icon', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render SelectIcon', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
          <SelectIcon data-testid="icon" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
