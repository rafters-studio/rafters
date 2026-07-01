import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../src/old/ui/button';
import { ButtonGroup, useButtonGroupContext } from '../../../src/old/ui/button-group';

describe('ButtonGroup', () => {
  describe('Rendering', () => {
    it('renders children buttons', () => {
      render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('renders with single button', () => {
      render(
        <ButtonGroup>
          <Button>Only</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Only' })).toBeInTheDocument();
    });

    it('forwards ref to container element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <ButtonGroup ref={ref}>
          <Button>Test</Button>
        </ButtonGroup>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveRole('group');
    });
  });

  describe('Orientation', () => {
    it('defaults to horizontal orientation', () => {
      render(
        <ButtonGroup>
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>,
      );

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('data-orientation', 'horizontal');
      expect(group).toHaveClass('flex-row');
    });

    it('supports vertical orientation', () => {
      render(
        <ButtonGroup orientation="vertical">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>,
      );

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('data-orientation', 'vertical');
      expect(group).toHaveClass('flex-col');
    });

    it('applies horizontal connected border classes', () => {
      const { container } = render(
        <ButtonGroup orientation="horizontal">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>,
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toHaveClass('[&>*:first-child]:rounded-r-none');
      expect(group).toHaveClass('[&>*:last-child]:rounded-l-none');
      expect(group).toHaveClass('[&>*:not(:first-child)]:-ml-px');
    });

    it('applies vertical connected border classes', () => {
      const { container } = render(
        <ButtonGroup orientation="vertical">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>,
      );

      const group = container.querySelector('[role="group"]');
      expect(group).toHaveClass('[&>*:first-child]:rounded-b-none');
      expect(group).toHaveClass('[&>*:last-child]:rounded-t-none');
      expect(group).toHaveClass('[&>*:not(:first-child)]:-mt-px');
    });
  });

  describe('Size context', () => {
    it('provides default size in context', () => {
      render(
        <ButtonGroup>
          <Button>Test</Button>
        </ButtonGroup>,
      );

      // ButtonGroup provides size via context (useButtonGroupContext)
      // Button component must consume context for inheritance to work
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('accepts size prop', () => {
      render(
        <ButtonGroup size="sm">
          <Button>Small</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('accepts lg size', () => {
      render(
        <ButtonGroup size="lg">
          <Button>Large</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('accepts icon size', () => {
      render(
        <ButtonGroup size="icon">
          <Button aria-label="Action 1">X</Button>
          <Button aria-label="Action 2">Y</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('Context', () => {
    it('provides context to children', () => {
      function ContextConsumer() {
        const context = useButtonGroupContext();
        return (
          <div data-testid="context">
            {context ? `size:${context.size},orientation:${context.orientation}` : 'no-context'}
          </div>
        );
      }

      render(
        <ButtonGroup size="lg" orientation="vertical">
          <ContextConsumer />
        </ButtonGroup>,
      );

      expect(screen.getByTestId('context')).toHaveTextContent('size:lg,orientation:vertical');
    });

    it('returns null when not in ButtonGroup', () => {
      function ContextConsumer() {
        const context = useButtonGroupContext();
        return <div data-testid="context">{context ? 'has-context' : 'no-context'}</div>;
      }

      render(<ContextConsumer />);

      expect(screen.getByTestId('context')).toHaveTextContent('no-context');
    });

    it('updates context when props change', () => {
      function ContextConsumer() {
        const context = useButtonGroupContext();
        return (
          <div data-testid="context">
            {context ? `size:${context.size},orientation:${context.orientation}` : 'no-context'}
          </div>
        );
      }

      const { rerender } = render(
        <ButtonGroup size="sm" orientation="horizontal">
          <ContextConsumer />
        </ButtonGroup>,
      );

      expect(screen.getByTestId('context')).toHaveTextContent('size:sm,orientation:horizontal');

      rerender(
        <ButtonGroup size="lg" orientation="vertical">
          <ContextConsumer />
        </ButtonGroup>,
      );

      expect(screen.getByTestId('context')).toHaveTextContent('size:lg,orientation:vertical');
    });
  });

  describe('Styling', () => {
    it('applies inline-flex base class', () => {
      render(
        <ButtonGroup>
          <Button>A</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toHaveClass('inline-flex');
    });

    it('applies focus stacking class', () => {
      render(
        <ButtonGroup>
          <Button>A</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group')).toHaveClass('[&>*:focus-visible]:z-10');
    });

    it('merges custom className', () => {
      render(
        <ButtonGroup className="custom-class gap-0">
          <Button>A</Button>
        </ButtonGroup>,
      );

      const group = screen.getByRole('group');
      expect(group).toHaveClass('custom-class');
      expect(group).toHaveClass('gap-0');
      expect(group).toHaveClass('inline-flex');
    });
  });

  describe('Props forwarding', () => {
    it('passes through additional HTML attributes', () => {
      render(
        <ButtonGroup data-testid="my-group" id="button-group-1">
          <Button>A</Button>
        </ButtonGroup>,
      );

      const group = screen.getByTestId('my-group');
      expect(group).toHaveAttribute('id', 'button-group-1');
    });

    it('supports aria-label', () => {
      render(
        <ButtonGroup aria-label="Document actions">
          <Button>Save</Button>
          <Button>Cancel</Button>
        </ButtonGroup>,
      );

      expect(screen.getByRole('group', { name: 'Document actions' })).toBeInTheDocument();
    });

    it('supports aria-labelledby', () => {
      render(
        <div>
          <span id="group-label">Actions</span>
          <ButtonGroup aria-labelledby="group-label">
            <Button>Save</Button>
          </ButtonGroup>
        </div>,
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'group-label');
    });
  });

  describe('Button variants', () => {
    it('works with default variant buttons', () => {
      render(
        <ButtonGroup>
          <Button variant="default">Primary</Button>
          <Button variant="default">Secondary</Button>
        </ButtonGroup>,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        expect(button).toHaveClass('bg-primary');
      }
    });

    it('works with outline variant buttons', () => {
      render(
        <ButtonGroup>
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
        </ButtonGroup>,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        expect(button).toHaveClass('border');
      }
    });

    it('works with mixed variant buttons', () => {
      render(
        <ButtonGroup>
          <Button variant="outline">Cancel</Button>
          <Button variant="default">Save</Button>
        </ButtonGroup>,
      );

      expect(screen.getByText('Cancel')).toHaveClass('border');
      expect(screen.getByText('Save')).toHaveClass('bg-primary');
    });

    it('works with ghost variant buttons', () => {
      render(
        <ButtonGroup>
          <Button variant="ghost">A</Button>
          <Button variant="ghost">B</Button>
        </ButtonGroup>,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('works with destructive variant buttons', () => {
      render(
        <ButtonGroup>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </ButtonGroup>,
      );

      expect(screen.getByText('Delete')).toHaveClass('bg-destructive');
    });
  });

  describe('Disabled state', () => {
    it('allows individual button disabling', () => {
      render(
        <ButtonGroup>
          <Button>First</Button>
          <Button disabled>Disabled</Button>
          <Button>Third</Button>
        </ButtonGroup>,
      );

      expect(screen.getByText('First')).not.toBeDisabled();
      expect(screen.getByText('Disabled')).toBeDisabled();
      expect(screen.getByText('Third')).not.toBeDisabled();
    });

    it('allows all buttons to be disabled', () => {
      render(
        <ButtonGroup>
          <Button disabled>A</Button>
          <Button disabled>B</Button>
        </ButtonGroup>,
      );

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button).toBeDisabled();
      }
    });
  });

  describe('Edge cases', () => {
    it('handles empty children gracefully', () => {
      render(<ButtonGroup>{null}</ButtonGroup>);

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('handles mixed children types', () => {
      render(
        <ButtonGroup>
          <Button>Button</Button>
          {false && <Button>Hidden</Button>}
          <Button>Another</Button>
        </ButtonGroup>,
      );

      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('works with many buttons', () => {
      render(
        <ButtonGroup>
          <Button>1</Button>
          <Button>2</Button>
          <Button>3</Button>
          <Button>4</Button>
          <Button>5</Button>
        </ButtonGroup>,
      );

      expect(screen.getAllByRole('button')).toHaveLength(5);
    });
  });
});
