import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from '../../../src/old/ui/button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click</Button>);
    expect(screen.getByText('Click')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('applies variant and size classes', () => {
    render(
      <div>
        <Button variant="secondary" size="lg">
          Ok
        </Button>
      </div>,
    );

    const btn = screen.getByRole('button');
    // class presence rather than exact string to avoid brittle ordering
    expect(btn.className).toContain('bg-secondary');
    expect(btn.className).toContain('px-6'); // lg size uses px-6
  });

  it('supports all shadcn variants', () => {
    render(
      <div>
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>,
    );

    expect(screen.getByText('Default').className).toContain('bg-primary');
    expect(screen.getByText('Secondary').className).toContain('bg-secondary');
    expect(screen.getByText('Destructive').className).toContain('bg-destructive');
    expect(screen.getByText('Outline').className).toContain('border');
    expect(screen.getByText('Ghost').className).toContain('hover:bg-accent');
  });

  it('supports all size variants', () => {
    render(
      <div>
        <Button size="default">Default</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">Icon</Button>
      </div>,
    );

    expect(screen.getByText('Default').className).toContain('h-10');
    expect(screen.getByText('Small').className).toContain('h-8');
    expect(screen.getByText('Large').className).toContain('h-12');
    expect(screen.getByText('Icon').className).toContain('w-10');
  });

  it('forwards onClick and respects disabled', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();

    render(
      <div>
        <Button onClick={spy}>Go</Button>
        <Button disabled onClick={spy}>
          No
        </Button>
      </div>,
    );

    await user.click(screen.getByText('Go'));
    expect(spy).toHaveBeenCalled();

    await user.click(screen.getByText('No'));
    expect(spy).toHaveBeenCalledTimes(1); // disabled should not call again
  });

  it('asChild anchor respects disabled and sets aria-disabled', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();

    render(
      <div>
        <Button asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              spy();
            }}
          >
            Link
          </button>
        </Button>
        <Button asChild disabled>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              spy();
            }}
          >
            Disabled
          </button>
        </Button>
      </div>,
    );

    await user.click(screen.getByText('Link'));
    expect(spy).toHaveBeenCalled();

    await user.click(screen.getByText('Disabled'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Disabled')).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports asChild pattern', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();

    render(
      <Button asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            spy();
          }}
        >
          Link
        </button>
      </Button>,
    );

    await user.click(screen.getByText('Link'));
    expect(spy).toHaveBeenCalled();
  });
});
