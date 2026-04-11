import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Container } from '../../src/components/ui/container';

describe('Container fill - Accessibility', () => {
  it('has no violations with fill="surface"', async () => {
    const { container } = render(
      <Container as="main" fill="surface">
        <h1>Surface content</h1>
        <p>Primary content surface with foreground contrast pair.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with fill="panel"', async () => {
    const { container } = render(
      <Container as="section" fill="panel">
        <p>Elevated panel content.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with fill="overlay"', async () => {
    const { container } = render(
      <Container fill="overlay">
        <p>Modal backdrop content.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with fill="glass"', async () => {
    const { container } = render(
      <Container fill="glass">
        <p>Glass morphism content.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with fill="primary"', async () => {
    const { container } = render(
      <Container fill="primary">
        <p>Primary brand surface.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with fill="hero" gradient', async () => {
    const { container } = render(
      <Container fill="hero">
        <h1>Hero heading</h1>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
