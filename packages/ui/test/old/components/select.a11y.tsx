/**
 * Select component accessibility tests
 * Tests ARIA attributes, keyboard navigation, and screen reader support
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectPortal,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../../src/old/ui/select';

describe('Select - Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <Select>
        <SelectTrigger aria-label="Select a fruit">
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

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Select a fruit">
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

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with groups', async () => {
    const { container } = render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Select option">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
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

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Select - ARIA Roles', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('trigger has role="combobox"', () => {
    render(
      <Select>
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

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('content has role="listbox"', async () => {
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
  });

  it('items have role="option"', async () => {
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
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });
  });

  it('groups have role="group"', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });
});

describe('Select - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('trigger has aria-expanded matching open state', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    // Closed state
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger has aria-haspopup="listbox"', () => {
    render(
      <Select>
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

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('trigger has aria-controls pointing to listbox', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    await user.click(trigger);

    await waitFor(() => {
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('id', controlsId);
    });
  });

  it('selected item has aria-selected="true"', async () => {
    render(
      <Select defaultValue="banana" defaultOpen>
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

    expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
  });

  it('disabled items have data-disabled attribute', async () => {
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
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const disabledItem = screen.getByRole('option', { name: 'Banana' });
    expect(disabledItem).toHaveAttribute('data-disabled');
  });
});

describe('Select - Keyboard Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('can be opened with Enter key', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    screen.getByRole('combobox').focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('can be opened with Space key', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    screen.getByRole('combobox').focus();
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('can be opened with ArrowDown key', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('can be opened with ArrowUp key', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('can be closed with Escape key', async () => {
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

  it('navigates options with ArrowDown', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });
  });

  it('navigates options with ArrowUp', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Navigate to last item first
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });

    // Navigate up
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });
  });

  it('selects option with Enter key', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('selects option with Space key', async () => {
    render(
      <Select defaultOpen>
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

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('navigates to first item with Home key', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    // Navigate to last
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });

    // Navigate to first with Home
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });
  });

  it('navigates to last item with End key', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });
  });

  it('skips disabled items during navigation', async () => {
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

    // Should skip Banana and go to Cherry
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus();
    });
  });
});

describe('Select - Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses first item when opened', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveFocus();
    });
  });

  it('focuses selected item when opened', async () => {
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
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });
  });

  it('returns focus to trigger when closed with Escape', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('returns focus to trigger after selection', async () => {
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

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: 'Apple' }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});

describe('Select - Typeahead', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses matching item on typeahead', async () => {
    const user = userEvent.setup();

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

    // Type 'b' to focus Banana
    await user.keyboard('b');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveFocus();
    });
  });

  it('focuses matching item with multiple characters', async () => {
    const user = userEvent.setup();

    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="apricot">Apricot</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Type 'apr' to focus Apricot
    await user.keyboard('apr');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Apricot' })).toHaveFocus();
    });
  });
});

describe('Select - Data State', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('trigger has data-state="closed" when closed', () => {
    render(
      <Select>
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

    expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'closed');
  });

  it('trigger has data-state="open" when open', async () => {
    const user = userEvent.setup();

    render(
      <Select>
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

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'open');
    });
  });

  it('content has data-state="open" when visible', async () => {
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
      expect(screen.getByRole('listbox')).toHaveAttribute('data-state', 'open');
    });
  });

  it('selected item has data-state="checked"', async () => {
    render(
      <Select defaultValue="apple" defaultOpen>
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
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute(
        'data-state',
        'checked',
      );
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute(
        'data-state',
        'unchecked',
      );
    });
  });
});

describe('Select - Separator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('separator has aria-hidden="true"', async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </SelectPortal>
      </Select>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('separator')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
