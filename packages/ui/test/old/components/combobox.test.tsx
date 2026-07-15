import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
} from '../../../src/old/ui/combobox';

const TestCombobox = ({
  value,
  onValueChange,
  open,
  onOpenChange,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (
  <Combobox value={value} onValueChange={onValueChange} open={open} onOpenChange={onOpenChange}>
    <ComboboxInput placeholder="Select framework..." data-testid="input" />
    <ComboboxContent data-testid="content">
      <ComboboxEmpty>No framework found.</ComboboxEmpty>
      <ComboboxGroup>
        <ComboboxItem value="react">React</ComboboxItem>
        <ComboboxItem value="vue">Vue</ComboboxItem>
        <ComboboxItem value="angular">Angular</ComboboxItem>
        <ComboboxItem value="svelte" disabled>
          Svelte
        </ComboboxItem>
      </ComboboxGroup>
    </ComboboxContent>
  </Combobox>
);

describe('Combobox - Basic Rendering', () => {
  it('should render input element', () => {
    render(<TestCombobox />);

    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select framework...')).toBeInTheDocument();
  });

  it('should not show content when closed', () => {
    render(<TestCombobox />);

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('should show content when open', () => {
    render(<TestCombobox open />);

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should render with namespaced components', () => {
    render(
      <Combobox open>
        <Combobox.Input placeholder="Test" data-testid="input" />
        <Combobox.Content data-testid="content">
          <Combobox.Empty>Empty</Combobox.Empty>
          <Combobox.Group heading="Options">
            <Combobox.Item value="one">One</Combobox.Item>
            <Combobox.Separator />
            <Combobox.Item value="two">Two</Combobox.Item>
          </Combobox.Group>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('Combobox - ARIA Attributes', () => {
  it('should have combobox role on input', () => {
    render(<TestCombobox />);

    expect(screen.getByTestId('input')).toHaveAttribute('role', 'combobox');
  });

  it('should have aria-autocomplete list', () => {
    render(<TestCombobox />);

    expect(screen.getByTestId('input')).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('should have aria-expanded false when closed', () => {
    render(<TestCombobox />);

    expect(screen.getByTestId('input')).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have aria-expanded true when open', () => {
    render(<TestCombobox open />);

    expect(screen.getByTestId('input')).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have aria-haspopup listbox', () => {
    render(<TestCombobox />);

    expect(screen.getByTestId('input')).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('should have listbox role on content', () => {
    render(<TestCombobox open />);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should have option role on items', () => {
    render(<TestCombobox open />);

    expect(screen.getAllByRole('option')).toHaveLength(4);
  });
});

describe('Combobox - Keyboard Navigation', () => {
  it('should open on ArrowDown', () => {
    const handleOpenChange = vi.fn();
    render(<TestCombobox onOpenChange={handleOpenChange} />);

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });

  it('should navigate options with ArrowDown', () => {
    render(<TestCombobox open />);

    const input = screen.getByTestId('input');

    // First ArrowDown highlights first option
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const reactOption = screen.getByText('React').closest('[role="option"]');
    expect(reactOption).toHaveAttribute('data-highlighted', 'true');
  });

  it('should navigate up with ArrowUp', () => {
    render(<TestCombobox open />);

    const input = screen.getByTestId('input');

    // Navigate down twice, then up once
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const reactOption = screen.getByText('React').closest('[role="option"]');
    expect(reactOption).toHaveAttribute('data-highlighted', 'true');
  });

  it('should close on Escape', () => {
    const handleOpenChange = vi.fn();
    render(<TestCombobox open onOpenChange={handleOpenChange} />);

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('should select on Enter', () => {
    const handleValueChange = vi.fn();
    render(<TestCombobox open onValueChange={handleValueChange} />);

    const input = screen.getByTestId('input');

    // Navigate to first option
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Select it
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleValueChange).toHaveBeenCalledWith('react');
  });

  it('should close on Tab', () => {
    const handleOpenChange = vi.fn();
    render(<TestCombobox open onOpenChange={handleOpenChange} />);

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Combobox - Selection', () => {
  it('should call onValueChange when item clicked', () => {
    const handleValueChange = vi.fn();
    render(<TestCombobox open onValueChange={handleValueChange} />);

    fireEvent.click(screen.getByText('Vue'));

    expect(handleValueChange).toHaveBeenCalledWith('vue');
  });

  it('should not select disabled items', () => {
    const handleValueChange = vi.fn();
    render(<TestCombobox open onValueChange={handleValueChange} />);

    fireEvent.click(screen.getByText('Svelte'));

    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('should show checkmark for selected item', () => {
    render(<TestCombobox open value="react" />);

    const reactOption = screen.getByText('React').closest('[role="option"]');
    expect(reactOption).toHaveAttribute('data-selected', 'true');
    expect(reactOption).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Combobox - Filtering', () => {
  it('should filter options based on input', () => {
    render(<TestCombobox open />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'rea' } });

    // Only React should be visible
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByText('Vue')).not.toBeInTheDocument();
    expect(screen.queryByText('Angular')).not.toBeInTheDocument();
  });

  it('should show empty state when no matches', () => {
    render(<TestCombobox open />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'xyz' } });

    expect(screen.getByText('No framework found.')).toBeInTheDocument();
  });

  it('should not show empty state when there are matches', () => {
    render(<TestCombobox open />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 're' } });

    expect(screen.queryByText('No framework found.')).not.toBeInTheDocument();
  });

  it('should open when typing', () => {
    const handleOpenChange = vi.fn();
    render(<TestCombobox onOpenChange={handleOpenChange} />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'r' } });

    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });
});

describe('Combobox - Groups', () => {
  it('should render group with heading', () => {
    render(
      <Combobox open>
        <Combobox.Input />
        <Combobox.Content>
          <Combobox.Group heading="Frameworks">
            <Combobox.Item value="react">React</Combobox.Item>
          </Combobox.Group>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByText('Frameworks')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('should have aria-labelledby for group with heading', () => {
    render(
      <Combobox open>
        <Combobox.Input />
        <Combobox.Content>
          <Combobox.Group heading="Frameworks">
            <Combobox.Item value="react">React</Combobox.Item>
          </Combobox.Group>
        </Combobox.Content>
      </Combobox>,
    );

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby');
  });
});

describe('Combobox - Separator', () => {
  it('should render separator', () => {
    render(
      <Combobox open>
        <Combobox.Input />
        <Combobox.Content>
          <Combobox.Item value="one">One</Combobox.Item>
          <Combobox.Separator data-testid="separator" />
          <Combobox.Item value="two">Two</Combobox.Item>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });
});

describe('Combobox - Toggle Button', () => {
  it('should toggle open state when toggle button clicked', () => {
    const handleOpenChange = vi.fn();
    render(<TestCombobox onOpenChange={handleOpenChange} />);

    const toggleButton = screen.getByRole('button', { name: /open/i });
    fireEvent.click(toggleButton);

    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });

  it('should show close label when open', () => {
    render(<TestCombobox open />);

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});

describe('Combobox - Mouse Interaction', () => {
  it('should highlight option on mouse enter', () => {
    render(<TestCombobox open />);

    const vueOption = screen.getByText('Vue').closest('[role="option"]');
    if (vueOption) fireEvent.mouseEnter(vueOption);

    expect(vueOption).toHaveAttribute('data-highlighted', 'true');
  });
});

describe('Combobox - Disabled State', () => {
  it('should mark disabled items with aria-disabled', () => {
    render(<TestCombobox open />);

    const svelteOption = screen.getByText('Svelte').closest('[role="option"]');
    expect(svelteOption).toHaveAttribute('aria-disabled', 'true');
    expect(svelteOption).toHaveAttribute('data-disabled', 'true');
  });
});

describe('Combobox - Custom className', () => {
  it('should merge custom className on input', () => {
    render(
      <Combobox>
        <Combobox.Input className="custom-input" data-testid="input" />
        <Combobox.Content>
          <Combobox.Item value="one">One</Combobox.Item>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByTestId('input').className).toContain('custom-input');
  });

  it('should merge custom className on content', () => {
    render(
      <Combobox open>
        <Combobox.Input />
        <Combobox.Content className="custom-content" data-testid="content">
          <Combobox.Item value="one">One</Combobox.Item>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByTestId('content').className).toContain('custom-content');
  });

  it('should merge custom className on item', () => {
    render(
      <Combobox open>
        <Combobox.Input />
        <Combobox.Content>
          <Combobox.Item value="one" className="custom-item" data-testid="item">
            One
          </Combobox.Item>
        </Combobox.Content>
      </Combobox>,
    );

    expect(screen.getByTestId('item').className).toContain('custom-item');
  });
});

describe('Combobox - Data Attributes', () => {
  it('should set data-state on input', () => {
    render(<TestCombobox open />);

    expect(screen.getByTestId('input')).toHaveAttribute('data-state', 'open');
  });

  it('should set data-state on content', () => {
    render(<TestCombobox open />);

    expect(screen.getByTestId('content')).toHaveAttribute('data-state', 'open');
  });

  it('should set data-value on items', () => {
    render(<TestCombobox open />);

    const reactOption = screen.getByText('React').closest('[role="option"]');
    expect(reactOption).toHaveAttribute('data-value', 'react');
  });
});
