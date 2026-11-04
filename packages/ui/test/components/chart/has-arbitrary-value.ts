/**
 * Whether a Tailwind class has an arbitrary value in its utility position.
 * Brackets in a modifier (`data-[state=open]:`) are not arbitrary; brackets in
 * the utility (`w-[3px]`, `hover:w-[3px]`) are. Unbalanced brackets are not a
 * class structure this can read, so they are not arbitrary.
 */
export function hasArbitraryValue(className: string): boolean {
  let depth = 0;
  let utilityStart = 0;

  for (let i = 0; i < className.length; i++) {
    const char = className[i];
    if (char === '[') depth++;
    else if (char === ']') depth--;
    else if (char === ':' && depth === 0) utilityStart = i + 1;
  }

  return depth === 0 && /\[.*\]/.test(className.slice(utilityStart));
}
