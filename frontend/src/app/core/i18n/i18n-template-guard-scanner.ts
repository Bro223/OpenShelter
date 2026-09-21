/**
 * The template scanner for the i18n template guard (N7 i18n-completeness
 * / F3). Kept in its own module (no test imports) so it is unit-testable
 * and demo-able without dragging the guard's describe block along.
 *
 * It flags three classes of hardcoded user-visible text:
 *   1. text nodes that are not interpolations or control-flow syntax,
 *   2. literal values of user-visible attributes (placeholder,
 *      aria-label, title, alt, message),
 *   3. string literals inside {{ … }} interpolations that look like copy
 *      (the class the old line-based scanner skipped entirely).
 *
 * The scanner is a character-level state machine (tags, quoted attribute
 * values, interpolations and control-flow statements are consumed as
 * units; quoted values and @let expressions may span lines — the
 * line-based scanner's failure mode). Inside interpolations, literals
 * followed by `| t` are the message-key seam; namespaced keys and
 * structural values (date formats, validator names, scroll tokens,
 * booleans, locale codes, input values) are not copy.
 */

export type Kind = 'text' | 'attr' | 'interp';

export interface Violation {
  line: number;
  kind: Kind;
  value: string;
  /** For kind='attr': `attrName="value"` as written. */
  raw?: string;
}

/**
 * Attributes whose LITERAL values are user-visible copy. (Bindings —
 * [attr.x] — and values starting with `i18n.` are skipped: the former
 * resolve at runtime, the latter are the locale-data seam.)
 */
const LITERAL_ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'message']);

/**
 * Interpolation literals that are structural, not copy: date pipe
 * formats, reactive-forms validator error names (errors?.['maxlength']),
 * scroll tokens, booleans, locale codes, input/autocomplete values.
 */
const STRUCTURAL_VALUES = new Set([
  'medium', 'short', 'long', 'full',
  'required', 'email', 'pattern', 'minlength', 'maxlength', 'min', 'max', 'equalto',
  'smooth', 'instant', 'center', 'nearest', 'auto', 'block', 'start', 'end',
  'true', 'false',
  'en', 'et', 'ru',
  'tel', 'password', 'text', 'numeric', 'decimal', 'one-time-code', 'new-password',
  'current-password', 'walking', 'on', 'off',
]);

/** A namespaced message key (a.b, a.b.c) — the `| t` seam's argument. */
const KEY_LIKE = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9]*)+$/;

/**
 * Is a quoted interpolation literal user-visible copy? Multi-word is
 * copy; namespaced keys and structural values are not; a single word is
 * copy when it is word-shaped (>=2 letters, letters plus at most
 * apostrophes/hyphens/ellipsis — 'Measuring…', 'Save', 'Full').
 */
function interpLiteralIsCopy(value: string, allowed: Set<string>): boolean {
  if (!value || allowed.has(value)) return false;
  if (value.includes(' ')) return true;
  if (KEY_LIKE.test(value)) return false;
  if (STRUCTURAL_VALUES.has(value)) return false;
  if (/^[\p{L}][\p{L}\u2019'\-…]*$/u.test(value)) {
    return (value.match(/\p{L}/gu) ?? []).length >= 2;
  }
  return false;
}

/** Consume a quoted interpolation literal run; report copy literals. */
function scanInterpolation(expr: string, line: number, allowed: Set<string>, out: Violation[]): void {
  let k = 0;
  while (k < expr.length) {
    const c = expr[k];
    if (c !== "'" && c !== '"') {
      k++;
      continue;
    }
    let n = k + 1;
    while (n < expr.length && expr[n] !== c) n++;
    const value = expr.slice(k + 1, n);
    // The `| t` seam: a literal followed by the translate pipe is a
    // message key, not copy.
    let m = n + 1;
    while (m < expr.length && (expr[m] === ' ' || expr[m] === '\n')) m++;
    const followedByT = /^\|\s*t\b/.test(expr.slice(m));
    if (!followedByT && interpLiteralIsCopy(value, allowed)) {
      out.push({ line, kind: 'interp', value });
    }
    k = n + 1;
  }
}

/** Consume the balanced (…) starting at the first '(' at/after k. */
function consumeBalancedParens(source: string, k: number): number {
  let m = k;
  while (m < source.length && source[m] !== '(') m++;
  if (m >= source.length) return k; // no condition — leave the rest as text
  let depth = 0;
  for (let n = m; n < source.length; n++) {
    if (source[n] === '(') depth++;
    else if (source[n] === ')') {
      depth--;
      if (depth === 0) return n + 1;
    }
  }
  return k;
}

/**
 * Consume one control-flow statement (at '@'): @let runs to ';'
 * (expressions contain no ';'); @if/@for/@switch/@case run to the
 * condition's matching ')'; @else/if to its optional condition; @empty
 * to its keyword end. The statement's '{' stays in the stream and is
 * stripped by the text flush as a block token.
 */
function consumeControlFlow(source: string, i: number): number {
  let k = i + 1;
  while (k < source.length && /[A-Za-z-]/.test(source[k])) k++;
  const keyword = source.slice(i + 1, k);
  if (keyword === 'let') {
    const semi = source.indexOf(';', k);
    return semi === -1 ? source.length : semi + 1;
  }
  if (keyword === 'if' || keyword === 'for' || keyword === 'switch' || keyword === 'case') {
    return consumeBalancedParens(source, k);
  }
  if (keyword === 'else') {
    let m = k;
    while (m < source.length && source[m] === ' ') m++;
    if (source.startsWith('if', m)) return consumeBalancedParens(source, m + 2);
    return k;
  }
  if (keyword === 'empty') return k;
  return k; // unknown '@' word — the word itself is not copy
}

/** Strip block tokens: a lone '{' or '}' is control-flow syntax. */
function stripBlockTokens(text: string): string {
  return text.replace(/[{}]/g, '');
}

/**
 * Scan one template. Character-level state machine: text | tag | quoted
 * attr value | interpolation | control-flow statement. Quoted attribute
 * values and @let expressions may span lines — state never resets on a
 * newline (the line-based scanner's failure mode).
 */
export function scanTemplate(source: string, perFile: Record<Kind, Set<string>>): Violation[] {
  const out: Violation[] = [];
  let i = 0;
  let line = 1;
  let textBuf = '';
  let textLine = 0;

  const flushText = (): void => {
    if (!textBuf) return;
    const trimmed = stripBlockTokens(textBuf).replace(/\s+/g, ' ').trim();
    if (trimmed && !perFile.text.has(trimmed)) {
      out.push({ line: textLine, kind: 'text', value: trimmed });
    }
    textBuf = '';
    textLine = 0;
  };
  const step = (n: number): void => {
    for (let k = 0; k < n && i + k < source.length; k++) {
      if (source[i + k] === '\n') line++;
    }
    i += n;
  };

  while (i < source.length) {
    if (source.startsWith('<!--', i)) {
      flushText();
      const e = source.indexOf('-->', i + 4);
      step(e === -1 ? source.length - i : e + 3 - i);
      continue;
    }
    if (source.startsWith('{{', i)) {
      flushText();
      const startLine = line;
      let depth = 1;
      let k = i + 2;
      while (k < source.length && depth > 0) {
        if (source.startsWith('{{', k)) {
          depth++;
          k += 2;
        } else if (source.startsWith('}}', k)) {
          depth--;
          k += 2;
        } else {
          k++;
        }
      }
      scanInterpolation(source.slice(i + 2, Math.max(i + 2, k - 2)), startLine, perFile.interp, out);
      step(k - i);
      continue;
    }
    if (source[i] === '<') {
      flushText();
      const tagStart = i;
      const tagStartLine = line;
      step(1);
      while (i < source.length && source[i] !== '>') {
        if (source[i] === '"' || source[i] === "'") {
          const q = source[i];
          const vStart = i + 1;
          step(1);
          while (i < source.length && source[i] !== q) step(1);
          const value = source.slice(vStart, i);
          step(1);
          // attribute name: walk back over the opening quote, '=' / '[' / ']' / spaces
          let j = vStart - 1;
          while (
            j > tagStart &&
            (source[j] === ' ' || source[j] === '=' || source[j] === '[' || source[j] === ']' || source[j] === q)
          ) {
            j--;
          }
          const nameEnd = j + 1;
          while (j > tagStart && !/\s/.test(source[j])) j--;
          const attr = source.slice(j + 1, nameEnd);
          const attrLine = tagStartLine + source.slice(tagStart, j + 1).split('\n').length - 1;
          if (attr && LITERAL_ATTRS.has(attr) && value && !value.startsWith('i18n.')) {
            const raw = `${attr}="${value}"`;
            if (!perFile.attr.has(raw)) {
              out.push({ line: attrLine, kind: 'attr', value, raw });
            }
          }
          continue;
        }
        step(1);
      }
      if (i < source.length) step(1); // '>'
      continue;
    }
    if (source[i] === '@') {
      flushText();
      const end = consumeControlFlow(source, i);
      step(end - i);
      continue;
    }
    if (!textBuf) textLine = line;
    textBuf += source[i];
    step(1);
  }
  flushText();
  return out;
}
