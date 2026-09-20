import { readFileSync } from 'node:fs';

/**
 * i18n-et-en DURABLE GUARD (translated surfaces): no hardcoded user-visible
 * text in the account templates — and, since INFO-LAST-REPORTED, in the
 * shelter detail template (its Info-section copy moved to the `detail.*`
 * catalog keys; the only literals left there are allow-listed below).
 *
 * The account area (features/account/**) was shipped as hardcoded English —
 * the templates never referenced i18n at all, so switching language changed
 * nothing here. This guard re-scans every account template on every test
 * run and fails when user-visible copy sits in the template OUTSIDE the
 * translation seam:
 *   - text nodes that are not an interpolation (`{{ … | t }}`) and not
 *     control-flow syntax,
 *   - literal values of the user-visible attributes (placeholder,
 *     aria-label, title, alt, message).
 * Dynamic values (`[attr]="'key' | t"`, `(event)`, `[formControl]`, …) and
 * structural attributes (id, for, class, type, maxlength, severity, role,
 * autocomplete, inputmode, …) are not copy and are skipped.
 *
 * The scanner is deliberately a small hand-rolled tokenizer (no DOM parser
 * is needed — vitest/jsdom runs node:fs against the real template files,
 * the same pattern the prepaint/design-tokens specs use):
 *   1. HTML comments are skipped,
 *   2. `{{ … }}` interpolations are skipped (brace-balanced, quote-aware —
 *      they may contain `{params}` object literals),
 *   3. control-flow headers `@if (…)`, `@for (…)`, `@let …;`, `@else if (…)`
 *      are skipped (paren-balanced, quote-aware) and the bare `{`/`}`
 *      delimiters ignored,
 *   4. everything left in a text position, and every checked attribute
 *      value, must be on the per-file allow-list below.
 *
 * Companion guard: the catalog identity guard (core/i18n/
 * catalog-identity.spec.ts) catches the sibling failure class — a catalog
 * value copied from EN instead of translated.
 *
 * Adding a template here is mandatory when a translated-surface component
 * gains one; extending the allow-list requires a justification comment.
 */

// ---------------------------------------------------------------------------
// Allow-lists — every entry justified; keep them short.
// ---------------------------------------------------------------------------

/** Literal VALUES of user-visible attributes that are legitimately
 *  hardcoded. Keys: `<file>: <attr>="<value>"`. */
const ALLOWED_ATTRS: Record<string, Record<string, string>> = {
  'account-page.html': {
    // The literal word the user must TYPE to arm the account erasure —
    // account-page.ts arms on value === 'DELETE'. A translated placeholder
    // would show a word that does not arm the delete, so it must stay the
    // ASCII code in every locale (the type-hint sentence around it IS
    // translated and quotes the literal word).
    'placeholder="DELETE"': 'arming word, not copy',
  },
};

/** Literal TEXT NODES that are legitimately hardcoded. Keys: file ->
 *  trimmed text. */
const ALLOWED_TEXT: Record<string, Record<string, string>> = {
  'verify-page.html': {
    // Decorative tick mark in .level-chip__mark, aria-hidden="true" —
    // screen readers skip it and it carries no language, so it is not
    // user-visible copy (the chip's text around it IS translated).
    '✓': 'aria-hidden decorative glyph',
    // The separator between the chip's status word and the channel noun
    // ("Verified · email"): a punctuation glyph, not a translated word —
    // its position/meaning is carried by the translated strings around it.
    '·': 'chip status/noun separator glyph',
  },
  'shelter-detail-page.html': {
    // The back-link's arrow ("← Back to the map"): a directional glyph,
    // not a translated word — the label next to it IS translated.
    '&larr;': 'decorative back-arrow glyph',
    // The Details section's registered-capacity data label ("Capacity: 30")
    // — the documented-stays-English label pair (see the detail.* comment
    // in core/i18n/messages.ts). The Info section's OWN Capacity row IS
    // catalog-keyed (detail.capacityLabel) and guarded as normal.
    'Capacity:': 'documented-stays-English data label (Details section)',
  },
};

/** The user-visible attributes whose LITERAL values are copy. */
const CHECKED_ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'message']);

const TEMPLATES: Record<string, string> = {
  'account-page.html': 'account',
  'contributions-panel.html': 'account',
  'verify-page.html': 'account',
  // INFO-LAST-REPORTED: the detail page's Info-section copy is catalog-
  // keyed now; the scanner re-checks the whole template on every run.
  'shelter-detail-page.html': 'shelter',
};

const FRONTEND_ROOT = process.cwd();

// ---------------------------------------------------------------------------
// The scanner
// ---------------------------------------------------------------------------

interface Violation {
  line: number;
  what: string;
}

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
    }
  }
  return line;
}

/** From the `open` char at index i, return the index just past the
 *  matching `close` (quote-aware, so quotes inside the construct are safe). */
function skipBalanced(source: string, i: number, open: string, close: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (; i < source.length; i++) {
    const c = source[i];
    if (quote !== null) {
      if (c === '\\') {
        i++;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
    } else if (c === open) {
      depth++;
    } else if (c === close) {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return source.length;
}

/** Index just past the tag starting at i (the '<'), quote-aware. */
function skipTag(source: string, i: number): number {
  let quote: string | null = null;
  for (let j = i + 1; j < source.length; j++) {
    const c = source[j];
    if (quote !== null) {
      if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
    } else if (c === '>') {
      return j + 1;
    }
  }
  return source.length;
}

function isControlFlowStart(source: string, i: number): boolean {
  if (source[i] !== '@') {
    return false;
  }
  const m = /^@[a-zA-Z]+/.exec(source.slice(i, i + 16));
  if (m === null) {
    return false;
  }
  const prev = i === 0 ? '' : source[i - 1];
  return prev === '' || /[\s{>]/.test(prev);
}

function scan(file: string, source: string): Violation[] {
  const violations: Violation[] = [];
  const allowedText = new Set(Object.keys(ALLOWED_TEXT[file] ?? {}));
  const allowedAttrs = new Set(Object.keys(ALLOWED_ATTRS[file] ?? {}));

  const n = source.length;
  let i = 0;
  let textStart = -1; // start offset of the current raw text span

  const flushText = (end: number): void => {
    if (textStart !== -1) {
      const raw = source.slice(textStart, end).replace(/[{}]/g, '');
      const trimmed = raw.trim();
      if (trimmed !== '' && !allowedText.has(trimmed)) {
        violations.push({
          line: lineOf(source, textStart),
          what: `hardcoded text: ${JSON.stringify(trimmed.slice(0, 90))}${trimmed.length > 90 ? '…' : ''}`,
        });
      }
      textStart = -1;
    }
  };

  while (i < n) {
    const c = source[i];

    if (source.startsWith('<!--', i)) {
      const closeAt = source.indexOf('-->', i);
      const stop = closeAt === -1 ? n : closeAt + 3;
      flushText(i);
      i = stop;
      continue;
    }

    if (source.startsWith('{{', i)) {
      flushText(i);
      i = skipBalanced(source, i + 1, '{', '}');
      continue;
    }

    if (isControlFlowStart(source, i)) {
      flushText(i);
      const word = /^@[a-zA-Z]+/.exec(source.slice(i, i + 16))![0];
      let j = i + word.length;
      if (word === '@let') {
        const semi = source.indexOf(';', j);
        const nl = source.indexOf('\n', j);
        i =
          semi !== -1 && (nl === -1 || semi < nl)
            ? semi + 1
            : nl === -1
              ? source.length
              : nl + 1;
        continue;
      } else {
        if (word === '@else') {
          const m = /^\s*if\s*\(/.exec(source.slice(j, j + 64));
          if (m !== null) {
            // m matched from j: land on the '(' (its last char).
            j = j + m[0].length - 1;
          }
        }
        while (j < n && (source[j] === ' ' || source[j] === '\n' || source[j] === '\t')) {
          j++;
        }
        i = source[j] === '(' ? skipBalanced(source, j, '(', ')') : j;
      }
      continue;
    }

    if (c === '{' || c === '}') {
      // Control-flow block delimiters (never user-visible).
      i++;
      continue;
    }

    if (c === '<') {
      flushText(i);
      const tagEnd = skipTag(source, i);
      // Attribute scan inside the tag.
      let k = i + 1;
      while (k < tagEnd - 1) {
        while (k < tagEnd - 1 && /\s/.test(source[k])) {
          k++;
        }
        if (k >= tagEnd - 1) {
          break;
        }
        const nameStart = k;
        while (k < tagEnd - 1 && !/[=\s>]/.test(source[k])) {
          k++;
        }
        const name = source.slice(nameStart, k);
        while (k < tagEnd - 1 && /\s/.test(source[k])) {
          k++;
        }
        if (name === '' || name === '/') {
          k++;
          continue;
        }
        if (source[k] !== '=') {
          continue; // bare attribute
        }
        k++;
        while (k < tagEnd - 1 && /\s/.test(source[k])) {
          k++;
        }
        if (k >= tagEnd - 1) {
          break;
        }
        const quote = source[k];
        if (quote !== "'" && quote !== '"') {
          break; // malformed for our purposes; leave it to the compiler
        }
        k++;
        const valueStart = k;
        while (k < tagEnd - 1 && source[k] !== quote) {
          k++;
        }
        const value = source.slice(valueStart, k);
        k++;
        if (!name.startsWith('[') && !name.startsWith('(') && CHECKED_ATTRS.has(name)) {
          const allowedKey = `${name}="${value}"`;
          if (value.trim() !== '' && !allowedAttrs.has(allowedKey)) {
            violations.push({
              line: lineOf(source, nameStart),
              what: `hardcoded ${name}="${value.trim()}" — route it through the t pipe`,
            });
          }
        }
      }
      i = tagEnd;
      continue;
    }

    if (textStart === -1) {
      textStart = i;
    }
    i++;
  }
  flushText(n);

  return violations;
}

// ---------------------------------------------------------------------------
// The guard
// ---------------------------------------------------------------------------

describe('i18n template guard (no hardcoded user-visible template text)', () => {
  for (const [file, dir] of Object.entries(TEMPLATES)) {
    it(`${file}: every user-visible string goes through the t pipe`, () => {
      const path = `${FRONTEND_ROOT}/src/app/features/${dir}/${file}`;
      const source = readFileSync(path, 'utf8');
      const violations = scan(file, source);
      expect(violations, violations.map((v) => `  line ${v.line}: ${v.what}`).join('\n')).toEqual([]);
    });
  }

  it('the scanner still has teeth (a synthetic template with literal copy fails)', () => {
    const bad = [
      '<section>',
      '  <h1>Account</h1>', // must be flagged
      '  <button [disabled]="busy()">Save changes</button>', // must be flagged
      '  <input placeholder="new@example.ee" />', // must be flagged
      '  <p>{{ "account.retry" | t }}</p>', // fine
      '  @if (ok()) { <p>{{ busy() ? ("a" | t) : ("b" | t) }}</p> }', // fine
    ].join('\n');
    const violations = scan('synthetic.html', bad);
    expect(violations.length).toBe(3);
  });
});
