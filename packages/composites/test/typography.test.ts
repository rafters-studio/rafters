/**
 * Typography composite validation tests
 *
 * Validates that all built-in typography .composite.json files
 * conform to CompositeFileSchema.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CompositeFileSchema } from '../src/manifest';

const TYPOGRAPHY_DIR = join(__dirname, '../src/typography');

const TYPOGRAPHY_NAMES = ['heading', 'paragraph', 'blockquote', 'list'] as const;

function loadTypography(name: string) {
	const raw = readFileSync(join(TYPOGRAPHY_DIR, `${name}.composite.json`), 'utf-8');
	return CompositeFileSchema.parse(JSON.parse(raw));
}

describe('typography composites', () => {
	for (const name of TYPOGRAPHY_NAMES) {
		it(`${name}.composite.json validates against CompositeFileSchema`, () => {
			expect(() => loadTypography(name)).not.toThrow();
		});
	}

	it('heading has level meta', () => {
		const heading = loadTypography('heading');
		expect(heading.blocks[0].meta?.level).toBe(2);
	});

	it('list has ordered meta', () => {
		const list = loadTypography('list');
		expect(list.blocks[0].meta?.ordered).toBe(false);
	});

	it('all typography composites have no I/O rules', () => {
		for (const name of TYPOGRAPHY_NAMES) {
			const composite = loadTypography(name);
			expect(composite.input).toEqual([]);
			expect(composite.output).toEqual([]);
		}
	});

	it('all typography composites are category "typography"', () => {
		for (const name of TYPOGRAPHY_NAMES) {
			const composite = loadTypography(name);
			expect(composite.manifest.category).toBe('typography');
		}
	});

	it('all typography composites have exactly one block', () => {
		for (const name of TYPOGRAPHY_NAMES) {
			const composite = loadTypography(name);
			expect(composite.blocks).toHaveLength(1);
		}
	});
});
