/**
 * FIRST-PARTY declaration shim for the vendored Quill 2.0.3 UMD bundle
 * (dist/quill.js) — NOT third-party bytes.
 *
 * Quill ships TypeScript declarations only for its ESM source entry
 * (quill.d.ts + the per-module .d.ts tree), and that entry's module graph
 * requires quill's runtime dependencies (parchment, quill-delta,
 * lodash-es, eventemitter3) as SEPARATE packages. We import the
 * self-contained UMD dist bundle instead (its dependencies are bundled
 * in), and the dist ships no declarations — so this shim declares the
 * exact API surface OpenShelter's GuidanceEditor uses. Keep it minimal;
 * extend only when the integration uses a new member.
 *
 * See ../README.md for the vendoring provenance and re-vendor procedure.
 */

/** A document position/selection (Quill's Range). */
export interface QuillRange {
  index: number;
  length: number;
}

/** One Delta operation (the quill-delta op shape, as far as we use it). */
export interface QuillDeltaOp {
  insert?: string | Record<string, unknown>;
  attributes?: Record<string, unknown> | null;
  retain?: number;
  delete?: number;
}

/** The quill-delta document model (only the surface the clipboard
 *  matchers and tests use). */
export class QuillDelta {
  constructor(ops?: QuillDeltaOp[]);
  ops: QuillDeltaOp[];
  length(): number;
  insert(content: string | Record<string, unknown>, attributes?: Record<string, unknown>): QuillDelta;
  push(op: QuillDeltaOp): QuillDelta;
}

export interface QuillToolbarConfig {
  /** An existing toolbar element (or selector) Quill wires up: its
   *  `ql-*`-classed buttons/selects become the controls. */
  container?: HTMLElement | string | null;
  /** Per-format click handlers, replacing Quill's defaults (e.g. the
   *  `link` prompt). Called with `this` = the toolbar module, so
   *  `this.quill` is the editor. */
  handlers?: Record<string, (this: { quill: Quill }, value: boolean | string) => void>;
}

export interface QuillOptions {
  /** Restrict the recognised formats to this list — anything else is
   *  stripped on paste/load. Omitted/null = everything Quill knows. */
  formats?: string[] | null;
  theme?: string;
  placeholder?: string;
  readOnly?: boolean;
  modules?: Record<string, Record<string, unknown> | boolean>;
  toolbar?: QuillToolbarConfig | boolean;
  bounds?: HTMLElement | string | null;
}

/** The clipboard module (paste + the HTML conversion pipeline). */
export interface QuillClipboard {
  /** Add a (selector, matcher) pair, run AFTER Quill's built-in
   *  matchers; the matcher transforms (or drops) the matched node's
   *  contribution to the pasted/loaded delta. */
  addMatcher(
    selector: string | string[],
    matcher: (node: Node, delta: QuillDelta, scroll: unknown) => QuillDelta,
  ): void;
  /** Replace the whole document with the (format-matched) HTML. */
  dangerouslyPasteHTML(html: string): void;
  /** Convert HTML through the clipboard matchers (no DOM change). */
  convert(input: { html?: string; text?: string }): QuillDelta;
}

/** The history (undo/redo) module. */
export interface QuillHistory {
  undo(): void;
  redo(): void;
  clear(): void;
}

/** The text-change payload (new delta, old delta, source). */
export type QuillTextChangeHandler = (
  delta: QuillDelta,
  oldDelta: QuillDelta,
  source: 'api' | 'silent' | 'user',
) => void;
export type QuillSelectionChangeHandler = (
  range: QuillRange | null,
  oldRange: QuillRange | null,
  source: 'api' | 'silent' | 'user',
) => void;

declare class Quill {
  static events: {
    EDITOR_CHANGE: string;
    TEXT_CHANGE: string;
    SELECTION_CHANGE: string;
    SCROLL_UPDATE: string;
  };
  static sources: { API: 'api'; SILENT: 'silent'; USER: 'user' };
  static version: string;
  /** 'delta' returns the quill-delta class (used to build match deltas). */
  static import(path: 'delta'): typeof QuillDelta;
  static import(path: string): unknown;

  constructor(container: HTMLElement | string, options?: QuillOptions);

  /** The editable root (`.ql-editor`); its innerHTML is the document. */
  root: HTMLElement;
  /** The wrapping `.ql-container` element (replaces nothing — the
   *  element passed to the constructor becomes the container). */
  container: HTMLElement;
  history: QuillHistory;
  clipboard: QuillClipboard;

  on(event: 'text-change', handler: QuillTextChangeHandler): void;
  on(event: 'selection-change', handler: QuillSelectionChangeHandler): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event?: string, handler?: (...args: unknown[]) => void): void;

  focus(options?: { preventScroll?: boolean }): void;
  blur(): void;
  /** The selection, or null when the editor is not focused. */
  getSelection(focus?: boolean): QuillRange | null;
  setSelection(index: number | null, length?: number, source?: string): void;

  /** The formats at a range/position (e.g. { header: 2, bold: true }). */
  getFormat(range?: QuillRange | number, length?: number): Record<string, unknown>;

  format(name: string, value: boolean | string | number | null, source?: string): QuillDelta;
  formatText(
    index: number,
    length: number,
    name: string,
    value: boolean | string | number | null,
    source?: string,
  ): QuillDelta;
  formatLine(
    index: number,
    length: number,
    name: string,
    value: boolean | string | number | null,
    source?: string,
  ): QuillDelta;
  insertText(index: number, text: string, source?: string): QuillDelta;
  deleteText(index: number, length: number, source?: string): QuillDelta;
  getLength(): number;
  getText(index?: number, length?: number): string;
  getContents(index?: number, length?: number): QuillDelta;
  setContents(contents: QuillDelta | QuillDeltaOp[], source?: string): void;
  update(source?: string): void;
  updateContents(delta: QuillDelta, source?: string): void;
  enable(enabled?: boolean): void;
  disable(): void;
  isEnabled(): boolean;
}

export default Quill;
