import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/old/ui/avatar';

describe('Avatar', () => {
  it('renders with default props', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar.className).toContain('rounded-full');
  });

  it('applies default size (md) classes', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-10');
    expect(avatar.className).toContain('w-10');
  });

  it('applies xs size classes', () => {
    render(
      <Avatar size="xs" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-6');
    expect(avatar.className).toContain('w-6');
    expect(avatar.className).toContain('text-xs');
  });

  it('applies sm size classes', () => {
    render(
      <Avatar size="sm" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-8');
    expect(avatar.className).toContain('w-8');
    expect(avatar.className).toContain('text-sm');
  });

  it('applies md size classes', () => {
    render(
      <Avatar size="md" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-10');
    expect(avatar.className).toContain('w-10');
    expect(avatar.className).toContain('text-base');
  });

  it('applies lg size classes', () => {
    render(
      <Avatar size="lg" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-12');
    expect(avatar.className).toContain('w-12');
    expect(avatar.className).toContain('text-lg');
  });

  it('applies xl size classes', () => {
    render(
      <Avatar size="xl" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('h-16');
    expect(avatar.className).toContain('w-16');
    expect(avatar.className).toContain('text-xl');
  });

  it('forwards ref to Avatar', () => {
    const ref = vi.fn();
    render(
      <Avatar ref={ref}>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSpanElement);
  });

  it('forwards ref to AvatarFallback', () => {
    const ref = vi.fn();
    render(
      <Avatar>
        <AvatarFallback ref={ref}>JD</AvatarFallback>
      </Avatar>,
    );
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges custom className with Avatar', () => {
    render(
      <Avatar className="custom-class" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('custom-class');
    expect(avatar.className).toContain('rounded-full');
  });

  it('merges custom className with AvatarFallback', () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-fallback" data-testid="fallback">
          JD
        </AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByTestId('fallback');
    expect(fallback.className).toContain('custom-fallback');
    expect(fallback.className).toContain('bg-muted');
  });
});

describe('AvatarImage', () => {
  it('renders image when src provided', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Test user" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'Test user');
  });

  it('applies correct styling classes to image', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Test user" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const img = screen.getByRole('img');
    expect(img.className).toContain('aspect-square');
    expect(img.className).toContain('object-cover');
  });

  it('forwards ref to AvatarImage', () => {
    const ref = vi.fn();
    render(
      <Avatar>
        <AvatarImage ref={ref} src="https://example.com/avatar.jpg" alt="Test" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLImageElement);
  });

  it('merges custom className with AvatarImage', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Test" className="custom-image" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const img = screen.getByRole('img');
    expect(img.className).toContain('custom-image');
    expect(img.className).toContain('object-cover');
  });

  it('calls onLoadingStatusChange when image loads', async () => {
    const onLoadingStatusChange = vi.fn();
    render(
      <Avatar>
        <AvatarImage
          src="https://example.com/avatar.jpg"
          alt="Test"
          onLoadingStatusChange={onLoadingStatusChange}
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const img = screen.getByRole('img');

    // Simulate successful load
    act(() => {
      img.dispatchEvent(new Event('load'));
    });

    await waitFor(() => {
      expect(onLoadingStatusChange).toHaveBeenCalledWith('loaded');
    });
  });

  it('calls onLoadingStatusChange when image errors', async () => {
    const onLoadingStatusChange = vi.fn();
    render(
      <Avatar>
        <AvatarImage
          src="https://example.com/broken.jpg"
          alt="Test"
          onLoadingStatusChange={onLoadingStatusChange}
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const img = screen.getByRole('img');

    // Simulate error
    act(() => {
      img.dispatchEvent(new Event('error'));
    });

    await waitFor(() => {
      expect(onLoadingStatusChange).toHaveBeenCalledWith('error');
    });
  });
});

describe('AvatarFallback', () => {
  it('shows fallback when no image src', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">JD</AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByTestId('fallback');
    expect(fallback.className).toContain('bg-muted');
    expect(fallback.className).toContain('text-muted-foreground');
    expect(fallback.className).toContain('rounded-full');
  });

  it('shows fallback on image error', async () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/broken.jpg" alt="Test" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    const img = screen.getByRole('img');

    // Simulate error
    act(() => {
      img.dispatchEvent(new Event('error'));
    });

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  it('hides fallback when image loads', async () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Test" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    const img = screen.getByRole('img');

    // Simulate successful load
    act(() => {
      img.dispatchEvent(new Event('load'));
    });

    await waitFor(() => {
      expect(screen.queryByText('JD')).not.toBeInTheDocument();
    });
  });

  it('delays fallback appearance with delayMs', async () => {
    vi.useFakeTimers();

    render(
      <Avatar>
        <AvatarFallback delayMs={500}>JD</AvatarFallback>
      </Avatar>,
    );

    // Fallback should not be visible initially
    expect(screen.queryByText('JD')).not.toBeInTheDocument();

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Fallback should now be visible
    expect(screen.getByText('JD')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not delay fallback when delayMs is undefined', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    // Fallback should be visible immediately
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders children content correctly', () => {
    render(
      <Avatar>
        <AvatarFallback>
          <span data-testid="icon">Icon</span>
        </AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('Avatar context', () => {
  it('throws error when AvatarImage is used outside Avatar', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AvatarImage src="test.jpg" alt="Test" />);
    }).toThrow('Avatar components must be used within an Avatar');

    consoleSpy.mockRestore();
  });

  it('throws error when AvatarFallback is used outside Avatar', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AvatarFallback>JD</AvatarFallback>);
    }).toThrow('Avatar components must be used within an Avatar');

    consoleSpy.mockRestore();
  });
});
