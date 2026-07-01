import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Progress } from '../../../src/old/ui/progress';

describe('Progress - Accessibility', () => {
  it('has no accessibility violations with determinate value', async () => {
    const { container } = render(<Progress value={50} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with indeterminate state', async () => {
    const { container } = render(<Progress />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations at 0% progress', async () => {
    const { container } = render(<Progress value={0} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations at 100% progress', async () => {
    const { container } = render(<Progress value={100} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom max', async () => {
    const { container } = render(<Progress value={5} max={10} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom value label', async () => {
    const { container } = render(
      <Progress
        value={3}
        max={10}
        getValueLabel={(value, max) => `${value} of ${max} files uploaded`}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with aria-label', async () => {
    const { container } = render(<Progress value={75} aria-label="Upload progress" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with aria-labelledby', async () => {
    const { container } = render(
      <div>
        <span id="progress-label">Download Progress</span>
        <Progress value={25} aria-labelledby="progress-label" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in form context', async () => {
    const { container } = render(
      <form>
        <label htmlFor="upload-progress">Upload Progress</label>
        <Progress id="upload-progress" value={60} />
      </form>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple progress bars', async () => {
    const { container } = render(
      <div>
        <div>
          <span id="task1">Task 1</span>
          <Progress value={100} aria-labelledby="task1" />
        </div>
        <div>
          <span id="task2">Task 2</span>
          <Progress value={50} aria-labelledby="task2" />
        </div>
        <div>
          <span id="task3">Task 3</span>
          <Progress aria-labelledby="task3" />
        </div>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with descriptive text', async () => {
    const { container } = render(
      <div>
        <Progress value={66} aria-label="Installation progress" aria-describedby="progress-desc" />
        <p id="progress-desc">Installing dependencies, please wait...</p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('uses native progress element for screen reader accessibility', async () => {
    const { container } = render(<Progress value={50} />);
    const nativeProgress = container.querySelector('progress');
    expect(nativeProgress).toBeInTheDocument();
    expect(nativeProgress).toHaveClass('sr-only');
    expect(nativeProgress).toHaveAttribute('value', '50');
    expect(nativeProgress).toHaveAttribute('max', '100');
  });

  it('native progress has correct aria attributes', async () => {
    const { container } = render(<Progress value={75} max={100} />);
    const nativeProgress = container.querySelector('progress');
    expect(nativeProgress).toHaveAttribute('aria-valuenow', '75');
    expect(nativeProgress).toHaveAttribute('aria-valuemin', '0');
    expect(nativeProgress).toHaveAttribute('aria-valuemax', '100');
    expect(nativeProgress).toHaveAttribute('aria-valuetext', '75%');
  });
});
