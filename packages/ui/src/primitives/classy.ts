/**
 * Classy combines classes. It flattens arrays, drops falsy inputs, takes the
 * keys of an object whose value is truthy, splits on whitespace, and removes
 * exact duplicates keeping first position. Every class it receives comes out.
 */

export type ClassInput =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | ClassInput[];

function collect(inputs: ClassInput[], out: Set<string>): void {
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      collect(input, out);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) addClasses(key, out);
      }
    } else {
      addClasses(String(input), out);
    }
  }
}

function addClasses(text: string, out: Set<string>): void {
  for (const part of text.split(/\s+/)) {
    if (part) out.add(part);
  }
}

export function classy(...inputs: ClassInput[]): string {
  const out = new Set<string>();
  collect(inputs, out);
  return [...out].join(' ');
}

export default classy;
