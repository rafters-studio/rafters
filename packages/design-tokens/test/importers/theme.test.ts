import { describe, expect, it } from 'vitest';
import { extractThemeBlocks } from '../../src/importers/theme.js';

describe('extractThemeBlocks', () => {
  it('extracts declarations from a single @theme block', () => {
    const css = `
@theme {
  --color-empire-500: #7C0E12;
  --color-republic-500: #3574B0;
}
`;
    expect(extractThemeBlocks(css)).toEqual([
      { name: 'color-empire-500', value: '#7C0E12' },
      { name: 'color-republic-500', value: '#3574B0' },
    ]);
  });

  it('extracts from both @theme and @theme inline blocks', () => {
    const css = `
@theme {
  --color-empire-500: #7C0E12;
}
@theme inline {
  --color-primary: var(--primary);
}
`;
    expect(extractThemeBlocks(css)).toEqual([
      { name: 'color-empire-500', value: '#7C0E12' },
      { name: 'color-primary', value: 'var(--primary)' },
    ]);
  });

  it('strips comments inside the block', () => {
    const css = `
@theme {
  /* Empire faction */
  --color-empire-500: #7C0E12;
  /* Republic faction */
  --color-republic-500: #3574B0;
}
`;
    expect(extractThemeBlocks(css)).toEqual([
      { name: 'color-empire-500', value: '#7C0E12' },
      { name: 'color-republic-500', value: '#3574B0' },
    ]);
  });

  it('returns empty for css with no @theme block', () => {
    expect(extractThemeBlocks(':root { --primary: red; }')).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(extractThemeBlocks('')).toEqual([]);
  });

  it('trims whitespace around values', () => {
    const css = `@theme {
  --color-empire-500:    #7C0E12   ;
}`;
    expect(extractThemeBlocks(css)).toEqual([{ name: 'color-empire-500', value: '#7C0E12' }]);
  });
});
