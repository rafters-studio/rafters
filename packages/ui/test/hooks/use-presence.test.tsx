import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from '../../src/hooks/use-presence';

function Overlay({ open, animated }: { open: boolean; animated?: boolean }) {
  const { present, ref, state } = usePresence(open);
  if (!present) return <span data-testid="gone" />;
  return (
    <div
      ref={ref}
      data-testid="node"
      data-state={state}
      style={animated ? { transition: 'opacity 200ms', transitionProperty: 'opacity' } : undefined}
    />
  );
}

afterEach(() => cleanup());

describe('usePresence', () => {
  it('present and open while open', () => {
    const { getByTestId } = render(<Overlay open />);
    expect(getByTestId('node').getAttribute('data-state')).toBe('open');
  });

  it('un-animated: closing unmounts immediately', () => {
    const { getByTestId, rerender } = render(<Overlay open />);
    rerender(<Overlay open={false} />);
    expect(getByTestId('gone')).toBeDefined();
  });

  it('animated: node stays present as data-state=closed until the transition ends', () => {
    const { getByTestId, rerender, queryByTestId } = render(<Overlay open animated />);
    const node = getByTestId('node');
    // Force a running transition so isAnimating() sees it.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      animationName: 'none',
      animationDuration: '0s',
      transitionDuration: '0.2s',
      transitionProperty: 'opacity',
    } as unknown as CSSStyleDeclaration);

    rerender(<Overlay open={false} animated />);
    // Still present, now closed -- the exit CSS is running.
    expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

    act(() => {
      node.dispatchEvent(new Event('transitionend'));
    });
    expect(queryByTestId('node')).toBeNull();
    vi.restoreAllMocks();
  });
});
