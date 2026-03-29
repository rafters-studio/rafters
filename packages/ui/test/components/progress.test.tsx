import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Progress } from '../../src/components/ui/progress';

describe('Progress', () => {
  describe('Rendering', () => {
    it('renders with default props (indeterminate)', () => {
      const { container } = render(<Progress />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders determinate with value prop', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('renders as div element', () => {
      const { container } = render(<Progress />);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('includes hidden native progress element for accessibility', () => {
      render(<Progress value={50} />);
      const nativeProgress = document.querySelector('progress');
      expect(nativeProgress).toBeInTheDocument();
      expect(nativeProgress).toHaveClass('sr-only');
    });
  });

  describe('Value and Max', () => {
    it('progress fill width matches value percentage', () => {
      const { container } = render(<Progress value={66} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '66%' });
    });

    it('max prop works correctly', () => {
      const { container } = render(<Progress value={5} max={10} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '50%' });
    });

    it('clamps value to 0 when negative', () => {
      const { container } = render(<Progress value={-10} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '0%' });
    });

    it('clamps value to max when exceeding', () => {
      const { container } = render(<Progress value={150} max={100} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '100%' });
    });

    it('value of 0 renders 0% width', () => {
      const { container } = render(<Progress value={0} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '0%' });
    });

    it('value of 100 renders 100% width', () => {
      const { container } = render(<Progress value={100} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveStyle({ width: '100%' });
    });
  });

  describe('getValueLabel callback', () => {
    it('getValueLabel callback is called with value and max', () => {
      const getValueLabel = vi.fn().mockReturnValue('custom label');
      render(<Progress value={50} max={100} getValueLabel={getValueLabel} />);
      expect(getValueLabel).toHaveBeenCalledWith(50, 100);
    });

    it('getValueLabel result is used for aria-valuetext', () => {
      const getValueLabel = vi.fn().mockReturnValue('5 of 10 files');
      render(<Progress value={5} max={10} getValueLabel={getValueLabel} />);
      const nativeProgress = document.querySelector('progress');
      expect(nativeProgress).toHaveAttribute('aria-valuetext', '5 of 10 files');
    });

    it('default value label is percentage', () => {
      render(<Progress value={75} />);
      const nativeProgress = document.querySelector('progress');
      expect(nativeProgress).toHaveAttribute('aria-valuetext', '75%');
    });

    it('getValueLabel receives clamped value', () => {
      const getValueLabel = vi.fn().mockReturnValue('label');
      render(<Progress value={150} max={100} getValueLabel={getValueLabel} />);
      expect(getValueLabel).toHaveBeenCalledWith(100, 100);
    });
  });

  describe('Indeterminate state', () => {
    it('no width style when indeterminate', () => {
      const { container } = render(<Progress />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).not.toHaveAttribute('style');
    });

    it('has aria-busy when indeterminate', () => {
      const { container } = render(<Progress />);
      expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    });

    it('no aria-busy when determinate', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.firstChild).not.toHaveAttribute('aria-busy');
    });

    it('native progress has no value when indeterminate', () => {
      render(<Progress />);
      const nativeProgress = document.querySelector('progress');
      expect(nativeProgress).not.toHaveAttribute('value');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to container div', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Progress ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('ref callback is called', () => {
      const ref = vi.fn();
      render(<Progress ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('className merging', () => {
    it('merges custom className', () => {
      const { container } = render(<Progress className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('preserves base classes with custom className', () => {
      const { container } = render(<Progress className="custom-class" />);
      expect(container.firstChild).toHaveClass('relative');
      expect(container.firstChild).toHaveClass('h-2');
      expect(container.firstChild).toHaveClass('w-full');
      expect(container.firstChild).toHaveClass('overflow-hidden');
      expect(container.firstChild).toHaveClass('rounded-full');
      expect(container.firstChild).toHaveClass('bg-muted');
    });
  });

  describe('Styling', () => {
    it('has correct container classes', () => {
      const { container } = render(<Progress />);
      expect(container.firstChild).toHaveClass(
        'relative',
        'h-2',
        'w-full',
        'overflow-hidden',
        'rounded-full',
        'bg-muted',
      );
    });

    it('indicator has correct base classes', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveClass('h-full', 'bg-primary', 'transition-all', 'duration-300');
    });

    it('has motion-reduce transition override', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveClass('motion-reduce:transition-none');
    });

    it('indeterminate has animation class', () => {
      const { container } = render(<Progress />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveClass('animate-progress-indeterminate');
    });

    it('indeterminate has motion-reduce animation override', () => {
      const { container } = render(<Progress />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toHaveClass('motion-reduce:animate-none');
    });

    it('determinate does not have animation class', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).not.toHaveClass('animate-progress-indeterminate');
    });
  });

  describe('HTML attributes passthrough', () => {
    it('passes through aria-label to native progress element', () => {
      const { container } = render(
        <Progress data-testid="progress" aria-label="Loading progress" />,
      );
      // aria-label is forwarded to the native <progress> element for screen readers
      const nativeProgress = container.querySelector('progress');
      expect(nativeProgress).toHaveAttribute('aria-label', 'Loading progress');
    });

    it('passes through id attribute', () => {
      render(<Progress id="my-progress" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveAttribute('id', 'my-progress');
    });
  });
});
