/** Preserve literal wording while resolving complete, properly nested conditions. */
export function calendarConditionalText(pattern: string, available: (name: string) => boolean) {
  const stack = [{ name: '', text: '' }];
  let cursor = 0;
  for (const match of pattern.matchAll(/\{\{\s*([#/])\s*(\w+)\s*\}\}/gu)) {
    stack.at(-1)!.text += pattern.slice(cursor, match.index);
    cursor = match.index! + match[0].length;
    const [, operator, name] = match;
    if (operator === '#') stack.push({ name, text: '' });
    else {
      if (stack.length === 1 || stack.at(-1)!.name !== name) return pattern;
      const section = stack.pop()!;
      if (available(name)) stack.at(-1)!.text += section.text;
    }
  }
  stack.at(-1)!.text += pattern.slice(cursor);
  return stack.length === 1 ? stack[0].text : pattern;
}
