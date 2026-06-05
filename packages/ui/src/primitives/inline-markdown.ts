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
  textGroup: number;
  hrefGroup?: number;
}

const PATTERNS: PatternDef[] = [
  {
    mark: 'link',
    pattern: /(?<!\\)\[([^\]]+)\]\(([^)]+)\)/g,
    textGroup: 1,
    hrefGroup: 2,
  },
  {
    mark: 'bold',
    pattern: /(?<!\\)(\*\*|__)(.+?)(?<!\\)\1/g,
    textGroup: 2,
  },
  {
    mark: 'strikethrough',
    pattern: /(?<!\\)~~(.+?)(?<!\\)~~/g,
    textGroup: 1,
  },
  {
    mark: 'code',
    pattern: /(?<!\\)`([^`]+)(?<!\\)`/g,
    textGroup: 1,
  },
  {
    mark: 'italic',
    pattern: /(?<![\\*])\*(?!\*)(.+?)(?<![\\*])\*(?!\*)/g,
    textGroup: 1,
  },
  {
    mark: 'italic',
    pattern: /(?<![\\\w])_(.+?)(?<!\\)_(?!\w)/g,
    textGroup: 1,
  },
];

export function detectInlineMarkdown(
  content: string,
  cursorOffset: number,
): InlineMarkdownMatch | null {
  for (const def of PATTERNS) {
    for (const m of content.matchAll(def.pattern)) {
      if (m.index === undefined) continue;
      const matchEnd = m.index + m[0].length;
      if (matchEnd !== cursorOffset) continue;

      const text = m[def.textGroup] ?? '';
      if (text.length === 0) continue;

      const match: InlineMarkdownMatch = {
        startOffset: m.index,
        endOffset: matchEnd,
        text,
        marks: [def.mark],
      };

      if (def.hrefGroup !== undefined) {
        match.href = m[def.hrefGroup] ?? '';
      }

      return match;
    }
  }

  return null;
}
