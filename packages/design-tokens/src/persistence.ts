import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Token } from '@rafters/shared';
import { writeFileAtomicSync } from './atomic-write.js';
import type { Plugin } from './graph.js';
import { TokenRegistry } from './registry.js';

export type NamespaceFileEnvelope = {
  $schema?: string;
  namespace?: string;
  version?: string;
  generatedAt?: string;
  tokens: unknown[];
};

export function loadRegistryFromDir(dir: string, plugins: readonly Plugin[] = []): TokenRegistry {
  const tokens: unknown[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.rafters.json')) continue;
    const raw = JSON.parse(readFileSync(join(dir, entry), 'utf8'));
    if (raw && Array.isArray(raw.tokens)) {
      tokens.push(...raw.tokens);
    }
  }
  return new TokenRegistry(tokens, plugins);
}

export function saveRegistryToDir(dir: string, registry: TokenRegistry): void {
  const envelopes = readEnvelopes(dir);
  const byNamespace = new Map<string, Token[]>();
  for (const token of registry.list()) {
    const list = byNamespace.get(token.namespace) ?? [];
    list.push(token);
    byNamespace.set(token.namespace, list);
  }
  for (const [namespace, tokens] of byNamespace) {
    const { tokens: previousTokens, ...previous } = envelopes.get(namespace) ?? { tokens: [] };
    // Unchanged tokens keep the file as it is, generatedAt included.
    if (JSON.stringify(previousTokens) === JSON.stringify(tokens)) continue;
    const file: NamespaceFileEnvelope = {
      ...previous,
      namespace,
      generatedAt: new Date().toISOString(),
      tokens,
    };
    writeFileAtomicSync(
      join(dir, `${namespace}.rafters.json`),
      `${JSON.stringify(file, null, 2)}\n`,
    );
  }
}

export function findTokenFile(dir: string, tokenName: string): string | undefined {
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.rafters.json')) continue;
    const path = join(dir, entry);
    if (!statSync(path).isFile()) continue;
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (!raw || !Array.isArray(raw.tokens)) continue;
    for (const token of raw.tokens) {
      if (token && typeof token === 'object' && (token as { name?: unknown }).name === tokenName) {
        return path;
      }
    }
  }
  return undefined;
}

function readEnvelopes(dir: string): Map<string, NamespaceFileEnvelope> {
  const out = new Map<string, NamespaceFileEnvelope>();
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.rafters.json')) continue;
    const raw = JSON.parse(readFileSync(join(dir, entry), 'utf8'));
    if (raw && typeof raw === 'object' && typeof raw.namespace === 'string') {
      out.set(raw.namespace, raw as NamespaceFileEnvelope);
    }
  }
  return out;
}
