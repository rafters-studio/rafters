/**
 * Generate a complete color system fixture from a single Tailwind color.
 *
 * Picks Tailwind indigo-500 in OKLCH, generates semantic color suggestions to get
 * additional families, builds ColorValues for each, fetches intelligence from
 * the API, and writes the fixture to packages/shared/test/fixtures/.
 *
 * Usage: pnpm tsx scripts/generate-color-fixture.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildColorValue, generateSemanticColorSuggestions } from '@rafters/color-utils';
import type { ColorValue, OKLCH } from '@rafters/shared';

// Tailwind indigo-500 in OKLCH
const INDIGO_500: OKLCH = { l: 0.457, c: 0.24, h: 277, alpha: 1 };

const API_BASE = 'https://api.rafters.studio';

async function fetchIntelligence(oklch: OKLCH): Promise<ColorValue['intelligence']> {
  const key = `${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`;
  const url = `${API_BASE}/color/${key}?sync=true`;
  console.log(`  Fetching intelligence for ${key}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  API returned ${res.status} for ${key}, skipping intelligence`);
      return undefined;
    }
    const data = await res.json();
    return data.color?.intelligence ?? undefined;
  } catch (err) {
    console.warn(`  Failed to fetch ${key}:`, err);
    return undefined;
  }
}

function buildColorWithToken(oklch: OKLCH, token: string, value: string = '500'): ColorValue {
  return buildColorValue(oklch, { token, value });
}

async function main() {
  console.log('Starting from Tailwind indigo-500:', INDIGO_500);

  // Step 1: Generate semantic suggestions (danger, success, warning, info)
  const suggestions = generateSemanticColorSuggestions(INDIGO_500);

  // Step 2: Build ColorValues for the base plus semantic families
  const families: Record<string, { oklch: OKLCH; token: string }> = {
    primary: { oklch: INDIGO_500, token: 'primary' },
  };

  const dangerColor = suggestions.danger[0];
  const successColor = suggestions.success[0];
  const warningColor = suggestions.warning[0];
  const infoColor = suggestions.info[0];

  if (dangerColor) families.destructive = { oklch: dangerColor, token: 'destructive' };
  if (successColor) families.success = { oklch: successColor, token: 'success' };
  if (warningColor) families.warning = { oklch: warningColor, token: 'warning' };
  if (infoColor) families.info = { oklch: infoColor, token: 'info' };

  console.log(`\nBuilding ${Object.keys(families).length} color families...`);

  // Step 3: Build ColorValues and fetch intelligence
  const colorValues: ColorValue[] = [];

  for (const [role, { oklch, token }] of Object.entries(families)) {
    console.log(`\n[${role}]`);
    const cv = buildColorWithToken(oklch, token);

    const intelligence = await fetchIntelligence(oklch);
    if (intelligence) {
      (cv as Record<string, unknown>).intelligence = intelligence;
      console.log(`  Intelligence loaded (${intelligence.reasoning.substring(0, 60)}...)`);
    }

    colorValues.push(cv);
  }

  // Step 4: Write fixture
  const fixtureDir = resolve(import.meta.dirname, '../packages/shared/test/fixtures');
  mkdirSync(fixtureDir, { recursive: true });

  const fixturePath = resolve(fixtureDir, 'indigo-color-system.json');
  const fixture = {
    source: {
      color: 'Tailwind indigo-500',
      oklch: INDIGO_500,
      generatedAt: new Date().toISOString(),
    },
    colors: colorValues,
  };

  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`\nFixture written to ${fixturePath}`);
  console.log(
    `${colorValues.length} families, ${colorValues.filter((c) => c.intelligence).length} with intelligence`,
  );
}

main().catch(console.error);
