import type { InlineMark } from './types';

export interface InlineMarkdownMatch {
  startOffset: number;
  endOffset: number;
  text: string;
  marks: InlineMark[];
  href?: string;
}

interface PatternDef {
  mark: InlineMark;
  pattern: RegExp;
  extractText: (m: RegExpExecArray) => string;
  extractHref?: (m: RegExpExecArray) => string;
}

const cap = (m: RegExpExecArray, i: number): string => m[i] ?? '';

const PATTERNS: PatternDef[] = [
  {
    mark: 'link',
    pattern: /(?<!\\)\[([^\]]+)\]\(([^)]+)\)/g,
    extractText: (m) => cap(m, 1),
    extractHref: (m) => cap(m, 2),
  },
  {
    mark: 'bold',
    pattern: /(?<!\\)(\*\*|__)(.+?)(?<!\\)\1/g,
    extractText: (m) => cap(m, 2),
  },
  {
    mark: 'strikethrough',
    pattern: /(?<!\\)~~(.+?)(?<!\\)~~/g,
    extractText: (m) => cap(m, 1),
  },
  {
    mark: 'code',
    pattern: /(?<!\\)`([^`]+)(?<!\\)`/g,
    extractText: (m) => cap(m, 1),
  },
  {
    mark: 'italic',
    pattern: /(?<!\\)(\*|_)(.+?)(?<!\\)\1/g,
    extractText: (m) => cap(m, 2),
  },
];

export function detectInlineMarkdown(
  content: string,
  cursorOffset: number,
): InlineMarkdownMatch | null {
  let closest: InlineMarkdownMatch | null = null;

  for (const def of PATTERNS) {
    for (const m of content.matchAll(def.pattern)) {
      if (m.index === undefined) continue;
      const matchEnd = m.index + m[0].length;
      if (matchEnd !== cursorOffset) continue;

      const text = def.extractText(m);
      if (text.length === 0) continue;

      const match: InlineMarkdownMatch = {
        startOffset: m.index,
        endOffset: matchEnd,
        text,
        marks: [def.mark],
      };

      if (def.extractHref) {
        match.href = def.extractHref(m);
      }

      if (closest === null || match.startOffset > closest.startOffset) {
        closest = match;
      }
    }
  }

  return closest;
}
