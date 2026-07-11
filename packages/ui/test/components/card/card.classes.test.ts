import { describe, expect, it } from 'vitest';
import { cardClasses } from '../../../src/components/card/card.classes';

function classes(config: Parameters<typeof cardClasses>[0]) {
  return cardClasses(config, {});
}

describe('card classes', () => {
  it('the base surface carries the card token triad', () => {
    const { root } = classes({});
    expect(root).toContain('bg-card');
    expect(root).toContain('text-card-foreground');
    expect(root).toContain('border-card-border');
  });

  it('header, title, description, content, and footer own fixed decoration', () => {
    const set = classes({});
    expect(set.header).toContain('flex flex-col');
    expect(set.title).toContain('text-title-medium');
    expect(set.description).toContain('text-body-small');
    expect(set.description).toContain('text-muted-foreground');
    expect(set.content).toContain('p-6 pt-0');
    expect(set.footer).toContain('flex items-center');
  });

  it('fill signatures resolve through the color vocabulary onto root only', () => {
    const filled = classes({ fill: 'primary' });
    expect(filled.root).toContain('bg-primary');
    expect(filled.root).toContain('text-primary-foreground');
    // Sub-parts stay fixed decoration -- fill never reaches them.
    expect(filled.header).not.toContain('bg-primary');
  });

  it('an unresolvable fill signature leaves the default surface alone', () => {
    const { root } = classes({ fill: 'not a signature' });
    expect(root).toContain('bg-card');
    expect(root).not.toContain('undefined');
  });
});
