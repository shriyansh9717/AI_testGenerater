/**
 * Language models occasionally wrap JSON in prose or code fences, or leave a
 * trailing comma. These helpers recover valid JSON without ever guessing content.
 */

function stripFences(text) {
  return String(text)
    .replace(/```(?:json|JSON)?/g, '')
    .replace(/```/g, '')
    .trim();
}

function extractBalanced(text) {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const opening = text[start];
  const closing = opening === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === opening) depth += 1;
    else if (char === closing) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function removeTrailingCommas(text) {
  return text.replace(/,(\s*[}\]])/g, '$1');
}

/** Returns a parsed object/array, or null when the text cannot be repaired. */
export function parseJsonLoose(raw) {
  if (!raw) return null;
  const candidates = [];
  const stripped = stripFences(raw);
  candidates.push(stripped);

  const balanced = extractBalanced(stripped);
  if (balanced) candidates.push(balanced);

  for (const candidate of candidates) {
    for (const attempt of [candidate, removeTrailingCommas(candidate)]) {
      try {
        return JSON.parse(attempt);
      } catch {
        // try the next repair strategy
      }
    }
  }
  return null;
}
