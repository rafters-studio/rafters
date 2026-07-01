import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ScrollArea, ScrollBar } from '../../../src/old/ui/scroll-area';

describe('ScrollArea - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ScrollArea className="h-48">
        <div className="p-4">
          <p>Scrollable content</p>
        </div>
      </ScrollArea>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all orientations', async () => {
    const orientations = ['vertical', 'horizontal', 'both'] as const;
    for (const orientation of orientations) {
      const { container } = render(
        <ScrollArea orientation={orientation} className="h-48 w-48">
          <div className="p-4">Content for {orientation} scroll</div>
        </ScrollArea>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <ScrollArea aria-label="Item list" role="region" className="h-48">
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </ScrollArea>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with long content', async () => {
    const { container } = render(
      <ScrollArea className="h-48">
        <div className="p-4">
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i}>Paragraph {i + 1}: Lorem ipsum dolor sit amet.</p>
          ))}
        </div>
      </ScrollArea>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with interactive content', async () => {
    const { container } = render(
      <ScrollArea className="h-48">
        <div className="p-4">
          <button type="button">Button 1</button>
          <a href="#link">Link 1</a>
          <button type="button">Button 2</button>
          <a href="#link2">Link 2</a>
        </div>
      </ScrollArea>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ScrollBar - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ScrollBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with both orientations', async () => {
    const orientations = ['vertical', 'horizontal'] as const;
    for (const orientation of orientations) {
      const { container } = render(<ScrollBar orientation={orientation} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations when marked as decorative', async () => {
    const { container } = render(<ScrollBar aria-hidden="true" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
