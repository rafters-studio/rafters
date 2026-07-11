import { describe, expect, it } from 'vitest';
import {
  breadcrumbClasses,
  breadcrumbEllipsisClasses,
  breadcrumbItemClasses,
  breadcrumbLinkClasses,
  breadcrumbListClasses,
  breadcrumbPageClasses,
  breadcrumbSeparatorClasses,
} from '../../../src/components/breadcrumb/breadcrumb.classes';

describe('breadcrumb classes', () => {
  it('root carries no decoration -- every visual choice lives on the children', () => {
    expect(breadcrumbClasses({}, {}).root).toBe('');
  });

  it('list, item, link, page, separator, and ellipsis are literal token strings', () => {
    expect(breadcrumbListClasses).toContain('text-muted-foreground');
    expect(breadcrumbItemClasses).toContain('inline-flex');
    expect(breadcrumbLinkClasses).toContain('hover:text-foreground');
    expect(breadcrumbPageClasses).toBe('text-foreground');
    expect(breadcrumbSeparatorClasses).toContain('size-3.5');
    expect(breadcrumbEllipsisClasses).toContain('justify-center');
  });

  it('no bg-*-subtle paired against solid *-foreground text (the known oracle defect class)', () => {
    for (const cls of [
      breadcrumbListClasses,
      breadcrumbItemClasses,
      breadcrumbLinkClasses,
      breadcrumbPageClasses,
      breadcrumbSeparatorClasses,
      breadcrumbEllipsisClasses,
    ]) {
      expect(cls).not.toMatch(/bg-\S+-subtle/);
    }
  });
});
