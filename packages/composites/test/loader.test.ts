import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadComposites } from '../src/loader';

const tmpDir = join(import.meta.dirname, '__test-composites__');

function writeComposite(name: string, data: unknown): void {
  writeFileSync(join(tmpDir, `${name}.composite.json`), JSON.stringify(data));
}

const validComposite = {
  manifest: {
    id: 'heading',
    name: 'Heading',
    category: 'typography',
    description: 'A heading block',
    keywords: [],
    cognitiveLoad: 1,
  },
  blocks: [{ id: '1', type: 'heading', content: 'Hello' }],
};

beforeEach(() => mkdirSync(tmpDir, { recursive: true }));
afterEach(() => rmSync(tmpDir, { recursive: true, force: true }));

describe('loadComposites', () => {
  it('loads valid composite files', async () => {
    writeComposite('heading', validComposite);
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(1);
    expect(result.composites[0].manifest.id).toBe('heading');
    expect(result.errors).toHaveLength(0);
  });

  it('loads multiple composite files', async () => {
    writeComposite('heading', validComposite);
    writeComposite('paragraph', {
      ...validComposite,
      manifest: { ...validComposite.manifest, id: 'paragraph', name: 'Paragraph' },
    });
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('reports invalid JSON', async () => {
    writeFileSync(join(tmpDir, 'bad.composite.json'), '{ invalid json }');
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toContain('bad.composite.json');
    expect(result.errors[0].error).toContain('Invalid JSON');
  });

  it('reports schema validation failures', async () => {
    writeComposite('invalid', { manifest: { id: 'x' } });
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toContain('invalid.composite.json');
  });

  it('separates valid and invalid files', async () => {
    writeComposite('good', validComposite);
    writeFileSync(join(tmpDir, 'bad.composite.json'), 'not json');
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(1);
    expect(result.composites[0].manifest.id).toBe('heading');
    expect(result.errors).toHaveLength(1);
  });

  it('ignores non-composite files', async () => {
    writeFileSync(join(tmpDir, 'readme.txt'), 'not a composite');
    writeFileSync(join(tmpDir, 'data.json'), '{}');
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty for nonexistent directory', async () => {
    const result = await loadComposites('/nonexistent/path/to/composites');
    expect(result.composites).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty for empty directory', async () => {
    const result = await loadComposites(tmpDir);
    expect(result.composites).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('applies schema defaults for input/output', async () => {
    writeComposite('minimal', validComposite);
    const result = await loadComposites(tmpDir);
    expect(result.composites[0].input).toEqual([]);
    expect(result.composites[0].output).toEqual([]);
  });
});
