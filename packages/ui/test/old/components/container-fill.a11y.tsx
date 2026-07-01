/**
 * Container fill accessibility (v2, #1637) -- the fill signature shapes:
 * word, word/alpha, word-to-word.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Container } from '../../../src/old/ui/container';

describe('Container fill - Accessibility', () => {
  it('has no violations with a semantic word fill', async () => {
    const { container } = render(
      <Container as="main" fill="primary">
        <h1>Primary surface</h1>
        <p>Semantic word with paired foreground contrast.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with the panel role word', async () => {
    const { container } = render(
      <Container as="section" fill="panel">
        <p>Elevated panel content.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with word/alpha scrims', async () => {
    const { container } = render(
      <Container fill="foreground/80">
        <p>Backdrop scrim content.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a family-position word', async () => {
    const { container } = render(
      <Container fill="neutral-950/80">
        <p>Literal dark surface.</p>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a gradient signature', async () => {
    const { container } = render(
      <Container fill="primary-to-primary/0">
        <h1>Hero heading</h1>
      </Container>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
