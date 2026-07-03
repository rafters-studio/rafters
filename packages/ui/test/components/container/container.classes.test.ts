import { describe, expect, it } from 'vitest';
import { containerClasses } from '../../../src/components/container/container.classes';

function root(config: Parameters<typeof containerClasses>[0]): string {
  return containerClasses(config, {}).root;
}

describe('container classes', () => {
  it('is a container-query provider by default, opt-out via query=false', () => {
    expect(root({})).toContain('@container w-full');
    expect(root({ query: false })).not.toContain('@container');
  });

  it('sized containers center and get CQ-responsive edge padding', () => {
    const sized = root({ size: '5xl' });
    expect(sized).toContain('max-w-5xl');
    expect(sized).toContain('mx-auto');
    expect(sized).toContain('px-4 @md:px-6 @lg:px-8');
    expect(root({ size: 'full' })).not.toContain('mx-auto');
  });

  it('explicit padding suppresses the auto edge padding', () => {
    const padded = root({ size: '4xl', padding: '8' });
    expect(padded).toContain('p-8');
    expect(padded).not.toContain('@md:px-6');
  });

  it('layout modes are exclusive: columns wins, gap becomes grid gap', () => {
    const gridMode = root({ columns: 3, gap: '6' });
    expect(gridMode).toContain('grid grid-cols-3');
    expect(gridMode).toContain('gap-6');
    expect(gridMode).not.toContain('flex-col');

    const stack = root({ gap: '4' });
    expect(stack).toContain('flex flex-col gap-4');
    expect(stack).not.toContain('grid ');
  });

  it('gap=true derives from size by walking the spacing scale', () => {
    expect(root({ size: 'sm', gap: true })).toContain('gap-3');
    expect(root({ size: '7xl', gap: true })).toContain('gap-12');
    expect(root({ gap: true })).toContain('gap-6');
    expect(root({ size: '5xl', gap: true, columns: 2 })).toContain('gap-10');
  });

  it('self-placement spans and depth ride the shared vocabularies', () => {
    const placed = root({ colSpan: 2, rowSpan: 3, depth: 'navigation', position: 'sticky' });
    expect(placed).toContain('col-span-2');
    expect(placed).toContain('row-span-3');
    expect(placed).toContain('z-depth-navigation');
    expect(placed).toContain('sticky top-0');
  });

  it('article mode carries the typographic flow and prose measure', () => {
    const article = root({ as: 'article' });
    expect(article).toContain('max-w-prose');
    expect(article).toContain('[&_h1]:');
    expect(root({ as: 'section' })).not.toContain('max-w-prose');
  });

  it('fill signatures resolve through the color vocabulary', () => {
    expect(root({ fill: 'muted' })).toContain('bg-muted');
  });
});
