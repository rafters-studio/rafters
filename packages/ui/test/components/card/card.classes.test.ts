import { describe, expect, it } from 'vitest';
import {
  cardActionClasses,
  cardClasses,
  cardContentClasses,
  cardDescriptionClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardTitleClasses,
} from '../../../src/components/card/card.classes';

function root(config: Parameters<typeof cardClasses>[0]): string {
  return cardClasses(config, {}).root;
}

describe('card classes', () => {
  it('defaults to the card surface token pairing plus the structural panel', () => {
    const classes = root({});
    expect(classes).toContain('bg-card');
    expect(classes).toContain('text-card-foreground');
    expect(classes).toContain('rounded-lg');
    expect(classes).toContain('border border-card-border');
    expect(classes).toContain('shadow-sm');
  });

  it('a resolved fill REPLACES the default surface -- no competing bg-card', () => {
    const filled = root({ fill: 'primary' });
    expect(filled).toContain('bg-primary');
    expect(filled).toContain('text-primary-foreground');
    expect(filled).not.toContain('bg-card');
    // structure survives the surface swap
    expect(filled).toContain('rounded-lg');
    expect(filled).toContain('border border-card-border');
  });

  it('a slash-alpha fill resolves through the color vocabulary', () => {
    expect(root({ fill: 'muted/50' })).toContain('bg-muted/50');
  });

  it('an invalid fill signature keeps the default card surface', () => {
    const bad = root({ fill: 'not a signature' });
    expect(bad).toContain('bg-card');
    expect(bad).toContain('text-card-foreground');
  });

  it('never emits a raw arbitrary value', () => {
    expect(root({ fill: 'primary' })).not.toMatch(/\[[a-z0-9.#]+\]/);
  });

  it('sub-part classes are config-independent literals', () => {
    expect(cardHeaderClasses).toBe('flex flex-col gap-1.5 p-6');
    expect(cardTitleClasses).toBe('text-title-medium leading-none');
    expect(cardDescriptionClasses).toBe('text-body-small text-muted-foreground');
    expect(cardContentClasses).toBe('p-6 pt-0');
    expect(cardFooterClasses).toBe('flex items-center p-6 pt-0');
    expect(cardActionClasses).toBe(
      'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
    );
  });
});
