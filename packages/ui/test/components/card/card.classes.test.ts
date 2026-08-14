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
    expect(classes).toContain('rounded-xl');
    expect(classes).toContain('border border-card-border');
    expect(classes).toContain('shadow-sm');
  });

  it('the ROOT owns the vertical rhythm, so arbitrary children get it too', () => {
    // shadcn v4 spacing: root is a flex column with gap-6 and py-6; parts carry
    // only their horizontal inset. A child dropped straight into a Card -- not
    // wrapped in CardContent -- picks up the same rhythm as the declared parts,
    // which per-part `p-6 pt-0` could never do.
    const classes = root({});
    expect(classes).toContain('flex flex-col');
    expect(classes).toContain('gap-6');
    expect(classes).toContain('py-6');
    // Vertical padding is py-6, never the old all-round p-6 the parts carried.
    expect(classes.split(' ')).not.toContain('p-6');
  });

  it('a resolved fill REPLACES the default surface -- no competing bg-card', () => {
    const filled = root({ fill: 'primary' });
    expect(filled).toContain('bg-primary');
    expect(filled).toContain('text-primary-foreground');
    expect(filled).not.toContain('bg-card');
    // structure survives the surface swap
    expect(filled).toContain('rounded-xl');
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
    expect(cardHeaderClasses).toBe(
      'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
    );
    expect(cardTitleClasses).toBe('text-title-medium ts-title-medium leading-none');
    expect(cardDescriptionClasses).toBe('text-body-small ts-body-small text-muted-foreground');
    expect(cardContentClasses).toBe('px-6');
    expect(cardFooterClasses).toBe('flex items-center px-6');
    expect(cardActionClasses).toBe(
      'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
    );
  });

  it('the header is a GRID whose second column opens only for a CardAction', () => {
    // This is the fix that makes cardActionClasses stop being inert. The
    // placement utilities below need a grid parent; before this the header was
    // `flex flex-col` in every framework and they resolved against nothing.
    expect(cardHeaderClasses).toContain('grid');
    expect(cardHeaderClasses).toContain('auto-rows-min');
    // Title over description, per v4.
    expect(cardHeaderClasses).toContain('grid-rows-[auto_auto]');
    // The second column is conditional on an action being present -- a header
    // with no action stays single-column.
    expect(cardHeaderClasses).toContain('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
    expect(cardHeaderClasses).not.toContain('flex flex-col');
  });

  it('the action places into that second column', () => {
    expect(cardActionClasses).toContain('col-start-2');
    expect(cardActionClasses).toContain('row-start-1');
    expect(cardActionClasses).toContain('justify-self-end');
  });

  it('semantic typography role tokens survive the v4 alignment', () => {
    // shadcn v4 uses raw `font-semibold` / `text-sm` here. The role tokens are
    // the product and they are invisible to a swap, so they stay.
    expect(cardTitleClasses).toContain('text-title-medium ts-title-medium');
    expect(cardDescriptionClasses).toContain('text-body-small ts-body-small');
    expect(cardTitleClasses).not.toContain('font-semibold');
    expect(cardDescriptionClasses).not.toContain('text-sm');
  });

  it('container queries stay OUT -- Tier B, tracked separately', () => {
    expect(cardHeaderClasses).not.toContain('@container');
  });
});
