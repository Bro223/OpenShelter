import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  type AfterViewInit,
  type OnInit,
  viewChild,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  type AbstractControl,
  type ValidationErrors,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { MessageKey } from '../../core/i18n/messages';
import { I18nService } from '../../core/i18n/i18n.service';
import { ApiError, toApiError } from '../../core/api-error';
import { AdminGateway } from '../../gateways/admin-gateway';
import type {
  AdminGuidancePostDto,
  CreateGuidanceTranslationRequest,
  GuidanceStatus,
  MediaAssetDto,
  UpdateGuidancePostRequest,
  CreateGuidancePostRequest,
  UpdateGuidanceTranslationRequest,
} from '../../core/models';
import { nameBlankValidator } from '../../shared/form-helpers';
import { BannerComponent } from '../../shared/banner.component';
import Quill from '../../../vendor/quill/2.0.3/dist/quill.js';
import type { QuillDelta } from '../../../vendor/quill/2.0.3/dist/quill.js';// The snow theme's stylesheet loads WITH the editor: the editor's init
// path (ngOnInit) injects a <link> to a VERSIONED static asset — the
// build copies the vendored quill.snow.css verbatim into dist (the
// angular.json assets entry), and the link is fetched only when the
// admin editor initialises. That keeps the ~24 kB of admin-only
// third-party CSS out of the component's inlined style (the
// anyComponentStyle budget is a 10 kB ERROR; inlining the theme here
// would be 28 kB of vendor bytes) and out of the initial bundle (an
// angular.json styles entry would put it there). The dynamic-import
// variant of this was rejected empirically: the esbuild builder emits
// a dynamic .css import as orphaned CSS files no code injects — see
// docs/rich-text-editor.md.

/** The runtime URL of the snow theme's stylesheet: a VERSIONED static
 *  asset (the version in the path is what makes a re-vendor cache-safe —
 *  a new version directory is a new URL). The build copies the vendored
 *  file VERBATIM from src/vendor/quill/<version>/dist into dist, keeping
 *  the vendor tree's layout (the angular.json assets entry); it is
 *  served publicly, like the admin chunk it styles (styling bytes, no
 *  secrets). Keep in lockstep with the version directories above. */
export const SNOW_THEME_HREF = '/vendor/quill/2.0.3/dist/quill.snow.css';

let snowThemeLinked = false;

/**
 * Inject the snow theme's stylesheet, once per app: the editor's init
 * path is the one place the theme is ever needed. A `<link>` is the
 * runtime stylesheet load the esbuild builder cannot provide as a lazy
 * CSS chunk (a dynamic import of the .css emits orphaned CSS assets no
 * code references — the theme would render UNstyled), and keeping the
 * ~24 kB of vendor CSS out of the component's inlined style is what
 * leaves the anyComponentStyle budget (a 10 kB error) firing for OUR
 * styles; an angular.json global styles entry would put the theme in
 * the initial bundle instead. See docs/rich-text-editor.md.
 */
function loadSnowTheme(): void {
  if (snowThemeLinked) {
    return;
  }
  snowThemeLinked = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SNOW_THEME_HREF;
  document.head.appendChild(link);
}

/** One control in the standard toolbar's config form: a bare format
 *  name (`'bold'`) or a `{ format: value }` pair (a scalar value like
 *  `'bullet'` builds a value button; an ARRAY of values like
 *  `[2, 3, false]` builds a picker — `false` marks the default).
 *  Declared HERE, not in the vendored quill.d.ts: the vendored files are
 *  kept pristine so a re-vendor is a byte-for-byte replacement (see
 *  src/vendor/quill/README.md), and the vendored declaration types
 *  `toolbar.container` as element/selector wiring only — not the config
 *  form. The shape is checked where it is written (the TOOLBAR constant
 *  below); Quill's `modules` option accepts it and passes it through. */
type QuillToolbarControl =
  | string
  | Record<string, string | number | boolean | Array<string | number | boolean>>;

/**
 * The generated-slug shape (the backend's SlugFactory validator
 * `^[a-z0-9]+(-[a-z0-9]+)*$`). The UI enforces the same shape up front so
 * an admin-supplied slug never spends a round trip on a 400; a BLANK slug
 * is always allowed (create: the server derives it from the title; edit:
 * the post keeps its current one).
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What Save emits — the page routes `id === null` to the create endpoint
 *  (the POST body) and a given id to the update endpoint (the PUT body).
 *  Translation authoring (bilingual-guidance) is a third shape: a given id
 *  with a `createTranslation` payload — the NEW row for that locale (the
 *  create endpoint, never the update one: the row does not exist yet).
 *  Translation editing is the fourth: a given id with an `updateTranslation`
 *  payload — the EXISTING row for that locale (the update endpoint; the
 *  home-locale row never takes this shape — its edit is the ordinary
 *  post edit that re-syncs the home row, the V26 invariant). */
export interface GuidanceEditorSave {
  /** null = create (no id yet); the post id for an edit. */
  id: number | null;
  /** Create mode: the POST /admin/guidance payload. */
  create?: CreateGuidancePostRequest;
  /** Edit mode: the PUT /admin/guidance/{id} payload. `status` is NOT part
   *  of it — the publication state moves only through publish/unpublish. */
  update?: UpdateGuidancePostRequest;
  /** Translation-authoring mode (bilingual-guidance): the
   *  POST /admin/guidance/{id}/translations payload (the target `locale`
   *  required). */
  createTranslation?: CreateGuidanceTranslationRequest;
  /** Translation-edit mode (bilingual-guidance): the target `locale` (the
   *  endpoint's path key) + the PUT
   *  /admin/guidance/{id}/translations/{locale} body — the EXISTING row
   *  for that locale. */
  updateTranslation?: { locale: string; request: UpdateGuidanceTranslationRequest };
}

/**
 * The slug's shape, enforced ONLY when non-blank (blank = optional — the
 * server derives the slug from the title on create and keeps the current
 * one on update). Mirrors the backend validator so the UI and the 400
 * agree.
 */
export function slugShapeValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return null;
  }
  return SLUG_PATTERN.test(value) ? null : { slug: true };
}

/**
 * The body's blank rule (the backend's @NotBlank, over HTML): the tags
 * are stripped before the trim — an editor holding only `<p><br></p>`
 * (or a bare `<br>`, or nothing) is EMPTY, exactly as an empty textarea
 * was. A raw-string trim would not see it (the tag characters are not
 * whitespace), so the rule needs its own validator.
 */
export function bodyHtmlBlankValidator(control: AbstractControl): ValidationErrors | null {
  const text = String(control.value ?? '').replace(/<[^>]*>/g, '');
  return text.trim() === '' ? { blank: true } : null;
}

/** The link protocols the sanitizer keeps, required as an explicit
 *  prefix: relative URLs and `javascript:`/`data:` are refused up front
 *  at the one place a URL is ever typed (the link prompt), so a link that
 *  is ever stored is one the server will keep. */
export const ALLOWED_LINK_PROTOCOL = /^(https?|mailto):/i;

/**
 * The pending hero-import URL's shape (guidance-hero-import), mirroring
 * the backend's write-time checks (GuidanceService.normalizeImportUrl) so
 * a malformed URL never spends a round trip on the 400: a parseable
 * absolute http(s) URL that names a host and carries no embedded
 * credentials. BLANK is always allowed — blank means "no pending import"
 * (the server stores null, like a cleared hero id). The length bound
 * (2048) is the control's own maxLength validator, as here for the slug.
 */
export function heroImportUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { importUrl: true };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { importUrl: true };
  }
  if (url.hostname === '') {
    return { importUrl: true };
  }
  if (url.username !== '' || url.password !== '') {
    return { importUrl: true };
  }
  return null;
}

/**
 * The formats the editor recognises — the BodySanitizer allowlist as
 * Quill format names:
 *
 *   header     -> h2 / h3 (values 2 and 3 only — the header clipboard
 *                 matcher strips h1/h4-h6; Quill itself knows all six)
 *   bold       -> strong
 *   italic     -> em
 *   link       -> a[href] (the prompt + the paste matcher enforce the
 *                 http/https/mailto protocol list)
 *   list       -> ul / ol / li (bullet and ordered; a pasted task-list
 *                 item is mapped to a bullet by the clipboard matcher)
 *   blockquote -> blockquote (round-trips stored quotes; no toolbar
 *                 button offers it, as before)
 *
 * (`p` and `br` need no format: `p` is the default block and `br` is a
 *  byproduct of typing.)
 *
 * The formats list is the editor's feature surface: the spec's
 * "editor formats list is a subset of the BodySanitizer allowlist"
 * guard maps every name in it (through BODY_EDITOR_FORMAT_TAGS) onto
 * the tags the server keeps, so a new format here fails the suite until
 * its tags are cross-checked against BodySanitizer.
 */
export const BODY_EDITOR_FORMATS: readonly string[] = [
  'header',
  'bold',
  'italic',
  'link',
  'list',
  'blockquote',
];

/** The header levels the editor admits (h1 belongs to the public page;
 *  h4-h6 are not on the sanitizer's allowlist). The restriction is
 *  enforced by the clipboard matchers below — the formats list can name
 *  `header` but not a value subset of it. */
export const BODY_EDITOR_HEADER_VALUES = [2, 3] as const;

/**
 * Quill format name -> the HTML tags it can produce in THIS editor. The
 * single source the durable guard (guidance-editor.spec.ts) checks
 * against the BodySanitizer allowlist: the key set must equal
 * BODY_EDITOR_FORMATS and every tag must be one the server keeps.
 */
export const BODY_EDITOR_FORMAT_TAGS: Record<string, readonly string[]> = {
  header: ['h2', 'h3'],
  bold: ['strong'],
  italic: ['em'],
  link: ['a'],
  list: ['ul', 'ol', 'li'],
  blockquote: ['blockquote'],
};

/* ---- the clipboard guard (paste/load cannot smuggle disallowed
   formats past the restricted registry) ------------------------------------ */

/** An href carrying an explicit protocol. (A protocol-less / relative
 *  URL resolves against the site — it cannot run code — so the server
 *  keeps it and so do we.) */
const EXPLICIT_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Whether a pasted `<a href>` survives: `javascript:`, `data:` — and
 * anything else with an explicit protocol the sanitizer drops (`tel:`,
 * `sms:`: Quill's own link whitelist admits them, ours must not) — is
 * stripped at the conversion stage; relative, fragment and
 * http/https/mailto hrefs pass exactly as the server would keep them.
 * A bare `<a>` with no href is stripped too (a dead anchor is noise).
 */
function keepPastedHref(href: string | null): boolean {
  if (href === null || href === '') {
    return false;
  }
  if (!EXPLICIT_PROTOCOL.test(href)) {
    return true;
  }
  return ALLOWED_LINK_PROTOCOL.test(href);
}

/** The quill-delta class (Quill.import('delta') — the UMD bundle keeps
 *  it reachable without a separate quill-delta package). */
function quillDelta(): typeof QuillDelta {
  return Quill.import('delta') as typeof QuillDelta;
}

/** Return `delta` with `format` removed from every op's attributes (an
 *  op left with no attributes keeps none at all — an empty attributes
 *  object is noise the normalizer would only re-strip on save). */
function stripDeltaFormat(delta: QuillDelta, format: string): QuillDelta {
  const Delta = quillDelta();
  return new Delta(
    delta.ops.map((op) => {
      const attributes = op.attributes;
      if (attributes === null || attributes === undefined || attributes[format] === undefined) {
        return op;
      }
      const rest: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(attributes)) {
        if (key !== format) {
          rest[key] = value;
        }
      }
      return { ...op, attributes: Object.keys(rest).length > 0 ? rest : undefined };
    }),
  );
}

/**
 * Pasted task-list items (`<li data-checked>`) paste as ordinary
 * bullets: the text and the list survive, the checkbox does not.
 * Defensive — today's Quill reads the list value from the container
 * (`ul`/`ol`), not from `data-checked`, so a pasted task list already
 * degrades to plain bullets; the matcher keeps it true if a re-vendor
 * ever changes that.
 */
function mapCheckedListItemsToBullet(delta: QuillDelta): QuillDelta {
  const CHECKED = new Set(['check', 'checked', 'unchecked']);
  const Delta = quillDelta();
  return new Delta(
    delta.ops.map((op) => {
      const list = op.attributes?.['list'];
      if (typeof list !== 'string' || !CHECKED.has(list)) {
        return op;
      }
      return { ...op, attributes: { ...op.attributes, list: 'bullet' } };
    }),
  );
}

/**
 * The region's DOM mapped to the sanitizer's allowlist — the client-side
 * twin of BodySanitizer: `b`→`strong`, `i`→`em`, `div`→`p` (the tag
 * choices some input paths make natively), every other disallowed
 * element unwrapped to its text (the server's exact treatment), and
 * every attribute dropped except `a[href]` with an allowlisted
 * protocol. Quill's own bookkeeping survives this too: the list item's
 * `data-list` attribute, the anchor's `target`/`rel` (Quill adds
 * `noopener` + a new tab during editing; the public page keeps links in
 * the same tab, as before) and the list item's invisible UI span are
 * all stripped or unwrapped here, so the WIRE value is clean even
 * though the live editor DOM is not. Idempotent on stored (already
 * sanitized) HTML, so loading runs it for free (the load is a no-op
 * over it).
 */
export function normalizeBodyRegion(editor: HTMLElement): void {
  for (const el of [...editor.querySelectorAll('b')]) {
    renameBlock(el, 'strong');
  }
  for (const el of [...editor.querySelectorAll('i')]) {
    renameBlock(el, 'em');
  }
  for (const el of [...editor.querySelectorAll('div')]) {
    renameBlock(el, 'p');
  }
  // Quill 2 renders EVERY list as <ol> (ListContainer.tagName is OL;
  // the markers come from the snow CSS reading the items' data-list),
  // so the live DOM of a bulleted list is <ol><li data-list="bullet">.
  // The stored/public markup uses the semantic tags, so the wire value
  // is remapped here: ordered items under <ol>, the rest under <ul>
  // (consecutive runs of a kind share a container). A container whose
  // items carry no data-list is not Quill bookkeeping and stays as-is.
  for (const container of [...editor.querySelectorAll('ol, ul')]) {
    normalizeListContainer(container as HTMLElement);
  }
  const keep = new Set([
    'h2',
    'h3',
    'p',
    'br',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'a',
    'blockquote',
  ]);
  for (const el of [...editor.querySelectorAll('*')]) {
    if (!keep.has(el.tagName.toLowerCase())) {
      unwrapElement(el);
    }
  }
  // A Quill arming cursor (the span.ql-cursor holding a zero-width
  // no-break space) can survive in the document when a format is armed
  // at a caret that never gets text: the span was unwrapped above, but
  // the invisible character must be stripped too, so neither it nor an
  // armed-but-unused inline (now empty) reaches the wire.
  const textWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let textNode: Node | null;
  while ((textNode = textWalker.nextNode()) !== null) {
    textNodes.push(textNode as Text);
  }
  for (const text of textNodes) {
    if (text.nodeValue !== null && text.nodeValue.includes('\uFEFF')) {
      text.nodeValue = text.nodeValue.replace(/\uFEFF/g, '');
    }
  }
  dropEmptyInlines(editor);
  for (const el of [...editor.querySelectorAll('*')]) {
    for (const name of [...el.getAttributeNames()]) {
      if (!(el.tagName.toLowerCase() === 'a' && name === 'href')) {
        el.removeAttribute(name);
      }
    }
  }
  for (const el of [...editor.querySelectorAll('a')]) {
    if (!ALLOWED_LINK_PROTOCOL.test(el.getAttribute('href') ?? '')) {
      el.removeAttribute('href');
    }
  }
}

/** Rename a block element (children move, attributes drop — blocks carry
 *  none the sanitizer would keep). */
function renameBlock(block: HTMLElement, tag: string): HTMLElement {
  const next = document.createElement(tag);
  const parent = block.parentNode;
  while (block.firstChild !== null) {
    next.appendChild(block.firstChild);
  }
  if (parent !== null) {
    parent.replaceChild(next, block);
  }
  return next;
}

/** Remap a Quill list container to the semantic tags (see the comment
 *  at the call site). Non-li children stay attached to the group that
 *  precedes them. */
function normalizeListContainer(container: HTMLElement): void {
  const lis = [...container.children].filter(
    (el) => el.tagName.toLowerCase() === 'li',
  ) as HTMLElement[];
  if (lis.length === 0 || !lis.some((li) => li.hasAttribute('data-list'))) {
    return;
  }
  const parent = container.parentNode;
  if (parent === null) {
    return;
  }
  let current: HTMLElement | null = null;
  let currentKind = '';
  for (const child of [...container.childNodes]) {
    const kind =
      child instanceof HTMLElement && child.tagName.toLowerCase() === 'li'
        ? listItemKind(child)
        : currentKind;
    if (kind !== currentKind) {
      current = document.createElement(kind);
      parent.insertBefore(current, container);
      currentKind = kind;
    }
    current?.appendChild(child);
  }
  parent.removeChild(container);
}

/** The semantic container for a Quill list item (ordered → <ol>,
 *  bullet/checked/unknown → <ul>). */
function listItemKind(li: HTMLElement): string {
  return li.getAttribute('data-list') === 'ordered' ? 'ol' : 'ul';
}

/** Remove an element, keeping its children in place (the sanitizer's
 *  "unwrapped to its text" treatment, applied client-side). */
function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (parent === null) {
    return;
  }
  while (el.firstChild !== null) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/** An armed-but-unused `<strong>`/`<em>` (a Quill format applied at a
 *  caret that never got text) must not reach the saved value — a `<br>`
 *  child stays, so a line of only such wrappers still counts as EMPTY
 *  for the blank rule. */
function dropEmptyInlines(root: ParentNode): void {
  for (const el of [...root.querySelectorAll('strong, em')]) {
    if ((el.textContent ?? '').trim() === '') {
      unwrapElement(el);
    }
  }
}

/**
 * The guidance create/edit form (crisis-guidance D8/D9 — the admin
 * authoring surface). The PARENT (AdminPage) owns the save calls and the
 * page-level banners — this component validates (incl. the hero/alt
 * cross-field rule, shown up front so the server's 400 never fires for
 * it) and emits the wire payload on Save. The one exception is the hero
 * upload: it is a self-contained picker flow (upload → refresh the
 * picker list → auto-select the new asset), so the editor calls
 * AdminGateway.uploadMediaAsset itself.
 *
 * The body is a QUILL 2 rich-text editor, vendored into the repo
 * (src/vendor/quill — see its README; no npm dependency), running on
 * Quill's OWN default (snow) theme and standard toolbar — the look is
 * upstream's; the only deviations are the a11y overrides in the
 * component stylesheet (48px touch targets, focus rings). It is
 * restricted to EXACTLY what survives the server sanitizer
 * (BodySanitizer is the authority): the `formats` option limits the
 * registry to the allowlist's capabilities, the clipboard matchers
 * above close the value-subset holes (h1/h4-h6 headers, non-allowlisted
 * link protocols, task-list items) that a formats list cannot express,
 * and the normalizer keeps the WIRE value clean even though Quill's
 * live DOM carries its own bookkeeping (data-list, noopener anchors,
 * list UI spans). The server still re-sanitizes on every write (defence
 * in depth, unchanged). See docs/rich-text-editor.md for the contract.
 */
@Component({
  selector: 'app-guidance-editor',
  imports: [ReactiveFormsModule, TranslatePipe, BannerComponent],
  templateUrl: './guidance-editor.html',
  styleUrl: './guidance-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Unscoped styles ON PURPOSE (the one component in the repo that uses
  // ViewEncapsulation.None): the a11y overrides below the form styles
  // target Quill's RUNTIME DOM (the .ql-toolbar controls, the editable
  // root), and the encapsulation scope attribute the default strategy
  // appends to every selector would make those rules match NOTHING —
  // Quill builds its DOM at runtime, so its elements carry no scope
  // attribute. (The vendored snow theme itself is a versioned static
  // asset linked in by the editor's init — `loadSnowTheme` — unscoped by
  // construction, so it needs no help from here.) Consequence: this component's own rules
  // are global too. They stay admin-only in effect (injected when the
  // lazy admin page first renders) and cannot change any other page:
  // every other component that styles a shared class (e.g. .field-note)
  // does so with its own SCOPED rule, and the scope attribute gives it
  // higher specificity than a bare global one. See docs/rich-text-editor.md.
  encapsulation: ViewEncapsulation.None,
})
export class GuidanceEditor implements OnInit, AfterViewInit {
  /** null = create mode; the post being edited for an edit (the PARENT
   *  passes the id-keyed GET result — the stored bodyHtml round-trips). */
  readonly post = input<AdminGuidancePostDto | null>(null);
  /** The media-library assets for the hero picker (null = still loading). */
  readonly mediaAssets = input<MediaAssetDto[] | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The failed save's server message (echoed in the editor banner); the
   *  editor stays open so the admin keeps the draft. */
  readonly serverError = input<string | null>(null);
  /**
   * The locale the post is getting a NEW translation in (bilingual-
   *  guidance); null = the ordinary create/edit form. Non-null =
   *  translation-authoring mode (edit mode only): the form is prefilled
   *  from the on-screen row (the slug blank — the server generates one
   *  from the translated title), the POST-level fields (pinned, the home-
   *  locale declaration, the hero choice) are off the form — a translation
   *  row carries title/slug/body/per-locale alt only — and Save emits the
   *  create-translation payload for the target locale.
   */
  readonly translationTarget = input<string | null>(null);
  /**
   * The locale whose EXISTING translation row the form is editing in
   * place (bilingual-guidance); null = not in translation-edit mode.
   * Non-null = translation-edit mode (edit mode only): the parent scoped
   * the post fetch to this locale (the form is prefilled from THAT row —
   * the slug prefilled, a blank slug keeps it on save), the POST-level
   * fields are off the form exactly as in authoring mode, and Save
   * emits the update-translation payload for the target locale (the
   * UPDATE endpoint — the row exists). The home-locale row never takes
   * this mode: editing it is the ordinary post edit (the path that
   * re-syncs the home row, the V26 invariant).
   */
  readonly translationEditMode = input<string | null>(null);

  readonly save = output<GuidanceEditorSave>();
  readonly cancel = output<void>();

  /**
   * The hero-import copy keys (guidance-hero-import's admin surface).
   * Every key is a real `Messages` member (en/et/ru catalogs, parity-
   * guarded in core/i18n/i18n.spec.ts): the property type keeps each
   * literal checked against the contract, so a renamed or removed key
   * fails the build here instead of rendering a blank label (the
   * `as MessageKey` cast that hid the 2026-09 hero-key gap is gone).
   */
  protected readonly i18nKeys: {
    readonly heroImportLabel: MessageKey;
    readonly heroImportHint: MessageKey;
    readonly heroImportInvalid: MessageKey;
    readonly heroNone: MessageKey;
    readonly heroImportNote: MessageKey;
  } = {
    heroImportLabel: 'admin.guidance.editor.hero.importLabel',
    heroImportHint: 'admin.guidance.editor.hero.importHint',
    heroImportInvalid: 'admin.guidance.editor.hero.importInvalid',
    heroNone: 'admin.guidance.editor.hero.none',
    heroImportNote: 'admin.guidance.editor.hero.importNote',
  };

  private readonly admin = inject(AdminGateway);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  /** The app is zoneless and Quill dispatches its events outside any
   *  Angular zone (there is no bound input event to schedule change
   *  detection anymore), so the component marks itself for check from
   *  Quill's text-change handler — the first view-ref use in the repo.
   *  (This build's injectable token is ChangeDetectorRef; the runtime
   *  object is the ViewRef with markForCheck.) */
  private readonly viewRef = inject(ChangeDetectorRef);
  /** The element Quill turns into the editor (it becomes .ql-container
   *  and creates the .ql-editor root inside it). The standard toolbar
   *  is BUILT by Quill (the snow theme) as a sibling of this element. */
  private readonly quillHostRef = viewChild<ElementRef<HTMLElement>>('quillHost');

  /** The editor instance (null before the view is ready). Public so the
   *  spec harness can drive it the way a user would (setSelection,
   *  history.undo, clipboard.convert). */
  quill: Quill | null = null;

  /** The in-flight hero upload (one at a time — the control is disabled
   *  while true so a double submit cannot fire two uploads). Public so
   *  specs can drive it (the page-spec convention). */
  readonly uploading = signal(false);
  /** The last upload failure, mapped by status (413 names the cap, 400
   *  the unsupported type, other the generic retry copy). */
  protected readonly heroUploadError = signal<string | null>(null);
  /** The assets uploaded in THIS editor session (newest first). The page
   *  passes the library list as `mediaAssets` and cannot be bumped from
   *  here, so the picker draws from this overlay + the library. */
  protected readonly heroUploads = signal<MediaAssetDto[]>([]);

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        // Whitespace-only titles pass Validators.required — the shared
        // blank validator mirrors the backend @NotBlank.
        nameBlankValidator,
        Validators.maxLength(255),
      ],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200), slugShapeValidator],
    }),
    body: new FormControl('', {
      nonNullable: true,
      // required = the old textarea's empty-string case; the HTML-blank
      // validator is the @NotBlank over markup (<p><br></p> is EMPTY —
      // a raw-string trim would not see it).
      validators: [Validators.required, bodyHtmlBlankValidator],
    }),
    locale: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(5)] }),
    pinned: new FormControl(false, { nonNullable: true }),
    /** The picked hero's media-library id; null = no hero. */
    heroImageId: new FormControl<number | null>(null, { nonNullable: true }),
    heroImageAlt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    /** The pending hero import (guidance-hero-import): blank = no pending
     *  import. Stored with the draft, fetched/validated/stored by the
     *  server at the next publish (a one-shot PUBLISHED create imports it
     *  in the create call). The shape validator mirrors the backend's
     *  write-time 400s; the length bound is the backend's 2048.
     *  Starts DISABLED: a new post is hero-less (the "no image" tick is
     *  checked by default) and the field re-enables when the tick is
     *  unchecked or a prefill shows a pending URL. Control-level disable
     *  on purpose — a [disabled] property binding does not stick next to
     *  a reactive form directive (Angular manages the element's disabled
     *  state from the control). */
    heroImportUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2048), heroImportUrlValidator],
    }),
    /** The explicit "no hero" tick: checked = this post has NO hero (no
     *  library asset AND no pending import URL). Checked by default (a
     *  new post starts hero-less) and prefilled from the SAVED state in
     *  edit mode — it is the visible, unambiguous way to say "no image":
     *  while checked, the picker / upload / URL controls are disabled and
     *  the check itself clears the hero choices (id + URL + alt, the last
     *  by the pairing rule). */
    noHero: new FormControl(true, { nonNullable: true }),
    /** Create mode only: DRAFT by default, PUBLISHED = one-shot
     *  write-and-publish. The edit form never sends it. */
    status: new FormControl<GuidanceStatus>('DRAFT', { nonNullable: true }),
  });

  /** The hero-picker panel's open state (toggled from the hero field). */
  protected readonly heroPickerOpen = signal(false);
  /** The last validated save left the post a DRAFT (create mode: the
   *  draft radio; edit mode: the post is a draft — the update payload
   *  carries no status, so the post's current state decides). Drives the
   *  "saved as a draft" notice: a draft save must never be silent about
   *  its consequence (the post is invisible on /blog until published).
   *  Starts false, and the page recreates the editor on every open, so it
   *  cannot leak from a previous post. */
  protected readonly draftSaved = signal(false);

  // ---- the body editor (Quill 2 over the sanitizer's allowlist) ----------
  /** The standard toolbar's control inventory (Quill's config form — the
   *  toolbar DOM is built by the snow theme from exactly this list):
   *  the header picker offers heading levels 2/3 plus the default
   *  paragraph (no h1 — the public page owns the single h1; no h4-h6 —
   *  not on the sanitizer's allowlist), the two list buttons (bullet/
   *  ordered — the sanitizer's block set), and the inline bold/italic/
   *  link. Nothing else is offered — no Quote (the owner removed that
   *  choice; a stored blockquote still round-trips), no underline, no
   *  images (hero-only). The toolbar IS the feature set: whatever is not
   *  offered here does not survive the server sanitizer. */
  private static readonly TOOLBAR: ReadonlyArray<ReadonlyArray<QuillToolbarControl>> = [
    [{ header: [...BODY_EDITOR_HEADER_VALUES, false] }],
    [{ list: 'bullet' }, { list: 'ordered' }],
    ['bold', 'italic', 'link'],
  ];
  /** The last refused link (the field's error line; a new attempt clears
   *  it). */
  protected readonly linkError = signal<string | null>(null);

  ngOnInit(): void {
    // The theme's stylesheet FIRST (before the create-mode early return —
    // the editor is created either way): one versioned <link> per app,
    // see loadSnowTheme().
    loadSnowTheme();
    const post = this.post();
    if (post === null) {
      // create mode — the form starts blank; the post is created in the
      // CONTENT language (admin-locale-scope + admin-locale-split — the
      // language line names it), so the locale control is prefilled with
      // it. The admin UI language does not drive it.
      this.form.get('locale')?.setValue(this.i18n.contentLocale());
      // the "no image" tick starts checked, so the URL field starts off
      // (see syncHeroImportDisabled).
      this.syncHeroImportDisabled();
      return;
    }
    // The translation-authoring mode (bilingual-guidance): the form is
    // prefilled from the ON-SCREEN row (the admin translates from what
    // they see), but the slug starts blank — the server generates one
    // from the translated title (reusing the source slug could collide
    // within the target locale). The hero fields mirror the post's SHARED
    // state (the pairing rule needs them); only the alt is saved with the
    // translation (the image reference is post-level, off the form).
    const translating = this.translationTarget() !== null;
    this.form.get('title')?.setValue(post.title);
    this.form.get('slug')?.setValue(translating ? '' : post.slug);
    // The editor round-trips what is stored (the sanitizer output) —
    // ngAfterViewInit loads it into Quill from this control.
    this.form.get('body')?.setValue(post.bodyHtml);
    // The locale control declares the post's HOME language — NOT the
    // content locale being edited (admin-locale-scope: a scoped read serves
    // the active locale's row, whose `locale` may differ from the home).
    // A foreign-locale edit never moves the home (server 400), so the
    // prefill is the home and the control stays a home declaration.
    this.form.get('locale')?.setValue(post.homeLocale);
    this.form.get('pinned')?.setValue(post.pinned);
    this.form.get('heroImageId')?.setValue(post.heroImageId);
    this.form.get('heroImageAlt')?.setValue(post.heroImageAlt ?? '');
    this.form.get('heroImportUrl')?.setValue(post.heroImportUrl ?? '');
    // The "no image" tick reflects the SAVED state: no library asset AND
    // no pending import URL. A post whose hero is a pending import (a
    // draft carrying heroImportUrl) counts as a hero — the tick stays
    // unchecked so the URL field below shows what is coming at publish.
    this.form
      .get('noHero')
      ?.setValue(post.heroImageId === null && (post.heroImportUrl ?? null) === null);
    // The URL field's enabled state follows the tick (see the control).
    this.syncHeroImportDisabled();
  }

  /**
   * The URL control's disabled state follows the "no image" tick: checked
   * = the field is off (and its value already cleared by the tick's
   * handler / the prefill). Control-level disable/enable (a [disabled]
   * binding next to formControlName does not stick — Angular manages the
   * element's disabled state from the control). A disabled control keeps
   * its value readable and stays out of the form's validity, so the save
   * path (which reads the control directly) is unaffected.
   */
  private syncHeroImportDisabled(): void {
    const control = this.heroImportUrl();
    if (this.noHero().value) {
      if (!control.disabled) {
        control.disable({ emitEvent: false });
      }
    } else if (control.disabled) {
      control.enable({ emitEvent: false });
    }
  }

  ngAfterViewInit(): void {
    const host = this.quillHostRef()?.nativeElement;
    if (host === undefined) {
      return;
    }
    this.initQuill(host);
  }

  /**
   * Construct the editor on the template's host element (no wrapper
   * library — the component owns the instance). The SNOW theme (Quill's
   * default) and the STANDARD toolbar are used on purpose: the look and
   * input mechanics are upstream's (default theme CSS, default toolbar
   * DOM built from the config form, default paste/undo/formatting), and
   * the only deviations are the a11y overrides in the component
   * stylesheet. The toolbar module is a QUILL 2 MODULE (a top-level
   * `toolbar` option is not read): the config form is handed through
   * `modules.toolbar.container`, and the snow theme builds the standard
   * control classes (`ql-header` picker, `ql-list` buttons, `ql-bold`/
   * `ql-italic`/`ql-link`) as a sibling of the host. Quill owns the
   * controls' `ql-active`/`aria-pressed` state — do not template-bind
   * those.
   */
  private initQuill(host: HTMLElement): void {
    const quill = new Quill(host, {
      theme: 'snow',
      // The restricted registry: anything not named here (colour,
      // underline, images, code blocks, align, indent, task lists, ...)
      // is dropped from pasted and loaded markup at the conversion
      // stage.
      formats: [...BODY_EDITOR_FORMATS],
      modules: {
        // Quill's history records API-sourced edits too by default
        // (userOnly: false) — then the first Ctrl+Z after opening the
        // editor would undo the LOAD of the stored body (an empty
        // document) instead of the admin's first real edit.
        history: { userOnly: true },
        // The standard toolbar (config form — see TOOLBAR above).
        toolbar: {
          container: GuidanceEditor.TOOLBAR,
          handlers: {
            // The toolbar's default for a link control would format with
            // the button's on/off value (a boolean, not a URL). Ours
            // prompts, validates the protocol against the sanitizer's
            // allowlist, and refuses everything else.
            link: () => this.insertLink(),
          },
        },
      },
    });

    // Quill clears the host and creates the editable root inside it.
    // The label's `for` (and the specs' value seam) target the root.
    quill.root.id = 'ge-body';
    this.attachRootValueSeam(quill);
    this.attachClipboardGuard(quill);
    // The round trip: the stored (server-sanitized) HTML goes in as
    // markup, not text — dangerouslyPasteHTML runs the same matcher
    // pipeline a paste goes through, so a load can smuggle no more than
    // a paste can. (The constructor itself would append a stray empty
    // paragraph to any pre-read content; constructing on an empty host
    // and loading here is the clean path.)
    this.loadBodyHtml(quill, this.body().value);

    quill.on('text-change', this.onQuillTextChange);
    this.quill = quill;
    this.syncRootAriaDescribedBy();

    this.destroyRef.onDestroy(() => {
      // Quill 2 has no destroy(): its document-level dispatch is ONE
      // module-scoped listener set that walks the live editor nodes, and
      // every per-instance state (blots, selection, history) is garbage
      // with the DOM Angular removes on view destruction. Dropping the
      // reference is the whole teardown.
      this.quill = null;
    });
  };

  /**
   * The `value` accessor on the editor root — the old textarea's
   * surface, which the specs (and any future harness) drive through:
   * `el.value = '<p>…</p>'`. The value IS the server-sanitized body
   * markup (BodySanitizer owns it), the same stored HTML the public
   * detail page renders via [innerHTML].
   */
  private attachRootValueSeam(quill: Quill): void {
    const root = quill.root;
    Object.defineProperty(root, 'value', {
      get: () => root.innerHTML,
      set: (next: string) => this.loadBodyHtml(quill, String(next)),
      configurable: true,
    });
  }

  /**
   * The value-subset holes the restricted registry cannot close on its
   * own:
   *  - `header` registers ALL of h1-h6 — pasted h1 (the public page
   *    owns the single h1) and h4-h6 (not on the allowlist) would
   *    survive as header:1/4/5/6; strip them to plain blocks.
   *  - `link`'s own whitelist admits `tel:`/`sms:` the server drops,
   *    and a bare `<a>` carries a dead href — both strip to text.
   *  - `list` can express task-list items the allowlist has no place
   *    for — mapped to bullets (defensive; see mapCheckedListItemsToBullet).
   */
  private attachClipboardGuard(quill: Quill): void {
    quill.clipboard.addMatcher(['h1', 'h4', 'h5', 'h6'], (_node, delta) =>
      stripDeltaFormat(delta, 'header'),
    );
    quill.clipboard.addMatcher('a', (node, delta) =>
      keepPastedHref((node as Element).getAttribute('href'))
        ? delta
        : stripDeltaFormat(delta, 'link'),
    );
    quill.clipboard.addMatcher('li', (_node, delta) => mapCheckedListItemsToBullet(delta));
  }

  /** Replace the whole document with `html` (or the empty-document shape
   *  for blank input). The form's body control follows the document. */
  private loadBodyHtml(quill: Quill, html: string): void {
    const text = html.replace(/<[^>]*>/g, '').trim();
    quill.clipboard.dangerouslyPasteHTML(text === '' ? '<p><br></p>' : html);
    this.syncBodyFromQuill();
  }

  /** Quill's text-change: the form's body control tracks the document,
   *  and the zoneless template state (the Save button's disabled flag,
   *  the error lines) is scheduled for a refresh — nothing else would. */
  private readonly onQuillTextChange = (): void => {
    this.syncBodyFromQuill();
    this.viewRef.markForCheck();
  };

  /** The document -> the form's body control (the wire value). An EMPTY
   *  document is Quill's `<p><br></p>` shape; the control carries the
   *  old editor's empty marker (the empty string) so the blank validator
   *  and the create payload behave exactly as the textarea's did. */
  private syncBodyFromQuill(): void {
    const root = this.quill?.root;
    if (root === null || root === undefined) {
      return;
    }
    const html = root.innerHTML;
    const blank = html.replace(/<[^>]*>/g, '').trim() === '';
    this.body().setValue(blank ? '' : html);
  }

  /** The refused-link error line follows the root's aria-describedby (
   *  the error replaces the hint — the old region's same contract). */
  private setLinkError(message: string | null): void {
    this.linkError.set(message);
    this.syncRootAriaDescribedBy();
  }

  private syncRootAriaDescribedBy(): void {
    const root = this.quill?.root;
    if (root !== null && root !== undefined) {
      root.setAttribute(
        'aria-describedby',
        this.linkError() === null ? 'ge-body-hint' : 'ge-body-link-error',
      );
    }
  }

  /**
   * The Link control (the toolbar's custom handler): prompt for the URL,
   * validate the protocol against the sanitizer's allowlist
   * (http/https/mailto) and refuse anything else (including
   * `javascript:`) — a refused link inserts nothing and names the rule
   * in the field's error line. A selection is required (Quill's link is
   * an inline format; with no selection the format would arm for the
   * next typed text, which is not the link contract).
   */
  protected insertLink(): void {
    const quill = this.quill;
    if (quill === null) {
      return;
    }
    const raw = window.prompt(this.i18n.t('admin.guidance.editor.link.prompt'))?.trim() ?? '';
    if (raw === '') {
      return; // cancelled — nothing to say
    }
    if (!ALLOWED_LINK_PROTOCOL.test(raw)) {
      this.setLinkError(this.i18n.t('admin.guidance.editor.link.invalid'));
      return;
    }
    const range = quill.getSelection();
    if (range === null || range.length === 0) {
      this.setLinkError(this.i18n.t('admin.guidance.editor.link.noSelection'));
      return;
    }
    this.setLinkError(null);
    quill.formatText(range.index, range.length, 'link', raw, 'user');
  }

  // ---- form accessors (the template's error-line convention) -----------
  protected title(): FormControl<string> {
    return this.form.get('title') as FormControl<string>;
  }

  protected slug(): FormControl<string> {
    return this.form.get('slug') as FormControl<string>;
  }

  protected body(): FormControl<string> {
    return this.form.get('body') as FormControl<string>;
  }

  protected locale(): FormControl<string> {
    return this.form.get('locale') as FormControl<string>;
  }

  protected heroImageId(): FormControl<number | null> {
    return this.form.get('heroImageId') as FormControl<number | null>;
  }

  protected heroImageAlt(): FormControl<string> {
    return this.form.get('heroImageAlt') as FormControl<string>;
  }

  protected heroImportUrl(): FormControl<string> {
    return this.form.get('heroImportUrl') as FormControl<string>;
  }

  protected noHero(): FormControl<boolean> {
    return this.form.get('noHero') as FormControl<boolean>;
  }

  /** The pending import URL as trimmed text — the note's condition and
   *  the save payload's value (blank = no pending import). */
  protected heroImportPending(): string {
    return this.heroImportUrl().value.trim();
  }

  /**
   * The hero/alt cross-field rule (the server's 400, shown up front):
   * 'required' = a hero is set with a blank alt; 'forbidden' = an alt
   * without a hero; null = paired correctly. A hero is a stored-asset
   * reference OR a pending import URL (the backend's requireHeroPairing
   * treats the URL like the asset id — both directions 400). A plain
   * method (not a computed) — the form controls are not signals, so a
   * computed would cache its first evaluation.
   */
  protected heroAltViolation(): 'required' | 'forbidden' | null {
    const hero = this.heroImageId().value;
    const hasHero = hero !== null || this.heroImportPending() !== '';
    const alt = this.heroImageAlt().value.trim();
    if (hasHero && alt === '') {
      return 'required';
    }
    if (!hasHero && alt !== '') {
      return 'forbidden';
    }
    return null;
  }

  /** The Save guard: the form's own validity AND the cross-field rule. */
  protected canSave(): boolean {
    return this.form.valid && this.heroAltViolation() === null;
  }

  /** The "saved as a draft" notice: shown after a save that leaves the
   *  post a DRAFT, hidden while a failed save's message is up (that save
   *  was not stored — the error banner is the treatment then). A normal
   *  state, not an error — the editor's info treatment. */
  protected draftSavedMessage(): string | null {
    if (!this.draftSaved() || this.serverError() !== null) {
      return null;
    }
    return this.post() === null
      ? this.i18n.t('admin.guidance.editor.savedAsDraft')
      : this.i18n.t('admin.guidance.editor.stillDraft');
  }

  /** Edit mode: the bound post is a draft — the at-a-glance state line
   *  (a draft is not public until published) replaces the published
   *  post's complementary note. */
  protected isDraftPost(): boolean {
    return this.post()?.status === 'DRAFT';
  }

  /**
   * The LANGUAGE LINE (admin-locale-scope): the UI must state which
   * language is being edited. Edit mode: the post's CONTENT locale of the
   * scoped read (the row the form round-trips); create mode: the CONTENT
   * language the post will be created in (admin-locale-split — not the
   * admin UI language). A plain method (re-evaluated on
   * each CD pass — the post input and the locale signal both change only
   * when the page recreates/switches the editor).
   */
  protected localeLine(): string {
    const post = this.post();
    const target = this.translationTarget();
    if (post === null) {
      return this.i18n.t('admin.guidance.editor.creatingIn', {
        locale: this.i18n.contentLocale(),
      });
    }
    if (target !== null) {
      return this.i18n.t('admin.guidance.editor.translatingIn', { locale: target });
    }
    const editMode = this.translationEditMode();
    if (editMode !== null) {
      return this.i18n.t('admin.guidance.editor.editingTranslationIn', { locale: editMode });
    }
    return this.i18n.t('admin.guidance.editor.editingIn', { locale: post.locale });
  }

  /**
   * The HOME-LOCALE NOTE: shown only when the form edits a FOREIGN row
   * (the content locale differs from the post's home) — saving changes
   * only this language's text, the other languages keep their own. Null
   * hides the line (the home-locale edit is the unscoped semantics).
   */
  protected homeLocaleNote(): string | null {
    const post = this.post();
    // Translation authoring AND translation editing replace the note: the
    // line above already says the other languages are untouched (and the
    // home declaration is off the form anyway).
    if (
      post === null ||
      this.translationTarget() !== null ||
      this.translationEditMode() !== null ||
      post.locale === post.homeLocale
    ) {
      return null;
    }
    return this.i18n.t('admin.guidance.editor.homeLocaleNote', {
      home: post.homeLocale,
      locale: post.locale,
    });
  }

  /**
   * The selected hero for the current-image card: the library asset
   * matched by id, falling back to the post's stored hero reference when
   * the library list has not loaded it yet (the serving URL is public).
   */
  /** The picker's list: the assets uploaded in this session (newest
   *  first) over the library (itself newest first). */
  protected pickerAssets(): MediaAssetDto[] {
    return [...this.heroUploads(), ...(this.mediaAssets() ?? [])];
  }

  protected selectedHero(): { url: string; name: string; srcset: string | null } | null {
    const id = this.heroImageId().value;
    if (id === null) {
      return null;
    }
    const match = this.pickerAssets().find((a) => a.id === id);
    if (match) {
      // P2-9: the asset's derivative srcset (null → the slot renders the
      // original via plain src).
      return { url: match.url, name: match.originalFilename, srcset: match.srcset ?? null };
    }
    const post = this.post();
    if (post === null || post.heroImageUrl === null) {
      return null;
    }
    // The hero is not on the loaded library page (an imported hero, or a
    // page past the current one): no srcset is available here — the slot
    // renders the original (the same degradation as an asset without
    // derivatives).
    return { url: post.heroImageUrl, name: post.heroImageAlt ?? post.title, srcset: null };
  }

  // ---- hero picker -------------------------------------------------------
  /** Pick the asset as the hero (the picker closes; the alt stays as typed
   *  — the cross-field rule takes over when it is blank). Picking a hero
   *  unchecks the "no image" tick — the tick never lies about a set hero. */
  selectHero(asset: MediaAssetDto): void {
    this.heroImageId().setValue(asset.id);
    this.noHero().setValue(false);
    this.syncHeroImportDisabled();
    this.heroPickerOpen.set(false);
  }

  /** Clear the hero; the asset itself stays in the media library. (The
   *  alt stays as typed — the cross-field rule takes over: an alt without
   *  a hero is the 'forbidden' violation, exactly as before this change.) */
  removeHero(): void {
    this.heroImageId().setValue(null);
  }

  /**
   * The "no image" tick (checked = this post has no hero). Checking it
   * is an explicit assertion, so it clears EVERY hero choice — the
   * picked asset id, the pending import URL and the alt (the pairing rule:
   * no hero means no alt). Unchecking is a no-op (nothing to
   * restore): it only re-enables the picker / upload / URL controls, and
   * the admin then sets a hero the ordinary way. The checked state is
   * read from the EVENT (not the control): the form binding and this
   * handler both listen to `change`, and the clear must not depend on
   * which of the two runs first.
   */
  onNoHeroChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.heroImageId().setValue(null);
      this.heroImportUrl().setValue('');
      this.heroImageAlt().setValue('');
      this.heroPickerOpen.set(false);
    }
    this.noHero().setValue(checked);
    this.syncHeroImportDisabled();
  }

  // ---- hero upload ---------------------------------------------------------
  /** The upload input's change: hand the chosen file to the upload (the
   *  input value resets FIRST — the same file stays re-selectable).
   *  The media-tab convention (AdminPage.onMediaFileChange). */
  onHeroFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Index access (not .item): FileList is indexable, and the spec sets a
    // plain array on `files`.
    const file = input.files?.[0];
    input.value = '';
    if (file !== null && file !== undefined) {
      void this.uploadHeroFile(file);
    }
  }

  /**
   * POST /admin/media via the gateway (the media tab's exact approach):
   * on success the new asset prepends to the picker list and is selected
   * as the hero (the picker closes, like a library pick — the alt stays
   * as typed, the cross-field rule takes over when it is blank). On
   * failure the form is left EXACTLY as it was — nothing is selected, the
   * input is already reset — and the mapped message surfaces in the
   * editor's error banner.
   */
  async uploadHeroFile(file: File): Promise<void> {
    if (this.uploading() || this.busy()) {
      return; // one in-flight mutation at a time (the page-level busy too)
    }
    this.heroUploadError.set(null);
    this.uploading.set(true);
    try {
      const asset = await this.admin.uploadMediaAsset(file);
      this.heroUploads.update((rows) => [asset, ...rows]);
      this.selectHero(asset);
    } catch (error) {
      this.heroUploadError.set(this.heroUploadErrorMessage(error));
    } finally {
      this.uploading.set(false);
    }
  }

  /** The upload failure, mapped by status: 413 names the 5 MB cap, 400 is
   *  the unsupported/type-mismatch (the backend magic-byte check), and
   *  everything else — 5xx, network — is the generic retry copy (never an
   *  echo of a non-JSON body, the error-copy convention). */
  private heroUploadErrorMessage(error: unknown): string {
    const api = error instanceof ApiError ? error : toApiError(error);
    if (api.status === 413) {
      return this.i18n.t('admin.guidance.editor.hero.uploadError.tooLarge');
    }
    if (api.status === 400) {
      return this.i18n.t('admin.guidance.editor.hero.uploadError.unsupported');
    }
    return this.i18n.t('admin.guidance.editor.hero.uploadError.generic');
  }

  // ---- submit / cancel ----------------------------------------------------
  /**
   * Validate and emit the wire payload. Blank slug/locale are OMITTED
   * (create: the server derives the slug and uses its default locale;
   * edit: the post keeps its current slug). The alt is trimmed and sent
   * as null when there is no hero (the pairing rule, both directions).
   */
  onSave(): void {
    this.form.markAllAsTouched();
    // The wire body: a CLONE of the document mapped to the allowlist
    // FIRST — the normalizer strips Quill's editing-time bookkeeping
    // (the data-list remap, the noopener anchors' target/rel, the list
    // UI spans) and maps any browser-native artifact to its allowed
    // equivalent, so the server never sees markup it would strip. A
    // clone on purpose: the normalizer mutates (renames, unwraps,
    // strips attributes) — running it on the LIVE root would desync
    // Quill's blot tree from its DOM (the MutationObserver would
    // re-parse a half-foreign tree on the next edit). The editor is
    // null only before the view is ready (unreachable from a real
    // save — the template does not render yet).
    const root = this.quill?.root;
    if (root !== null && root !== undefined) {
      const clone = root.cloneNode(true) as HTMLElement;
      normalizeBodyRegion(clone);
      const html = clone.innerHTML;
      this.body().setValue(html.replace(/<[^>]*>/g, '').trim() === '' ? '' : html);
    }
    const alt = this.heroImageAlt().value.trim();
    const hero = this.heroImageId().value;
    const importUrl = this.heroImportPending();
    // A hero is a stored-asset reference OR a pending import URL (the
    // backend's pairing rule — both directions 400, shown up front).
    const hasHero = hero !== null || importUrl !== '';
    if (this.form.invalid) {
      return; // the field errors are rendered from the touched state
    }
    if (hasHero && alt === '') {
      return; // the altRequired error line is rendered from the violation
    }
    if (!hasHero && alt !== '') {
      return; // the altForbidden error line is rendered from the violation
    }
    const title = this.title().value.trim();
    const slug = this.slug().value.trim();
    const body = this.body().value.trim();
    const locale = this.locale().value.trim();
    const pinned = this.form.get('pinned')?.value ?? false;
    const common = {
      title,
      ...(slug === '' ? {} : { slug }),
      body,
      ...(locale === '' ? {} : { locale }),
      pinned,
      heroImageId: hero,
      // The alt travels only with a hero of EITHER kind (the pairing
      // rule guarantees: hasHero -> alt non-blank, !hasHero -> alt blank).
      heroImageAlt: hasHero ? alt : null,
      // The pending import URL: omitted when blank — on the create that
      // is "no pending import", on the PUT (full replace) it CLEARS a
      // previously stored URL. Non-blank: stored with the draft, consumed
      // at publish (a one-shot PUBLISHED create imports it in the call).
      ...(importUrl === '' ? {} : { heroImportUrl: importUrl }),
    };
    const post = this.post();
    const translationTarget = this.translationTarget();
    const translationEdit = this.translationEditMode();
    if (post !== null && translationEdit !== null) {
      // Translation edit (bilingual-guidance): emit the EXISTING row's
      // payload for the target locale — the update endpoint, never the
      // create one (the row exists; a duplicate would 409 server-side,
      // but the UI must not even offer the other path). The home-locale
      // row never takes this shape (its edit is the ordinary post edit,
      // which re-syncs the home row — the V26 invariant). A blank slug is
      // omitted: the row keeps its current one. The alt travels only with
      // a hero of EITHER kind (the pairing rule guarantees: hasHero ->
      // alt non-blank, !hasHero -> alt blank; null clears it).
      this.save.emit({
        id: post.id,
        updateTranslation: {
          locale: translationEdit,
          request: {
            title,
            ...(slug === '' ? {} : { slug }),
            body,
            heroImageAlt: hasHero ? alt : null,
          },
        },
      });
      return;
    }
    if (post !== null && translationTarget !== null) {
      // Translation authoring (bilingual-guidance): emit the NEW-row
      // payload for the target locale — the create endpoint, never the
      // update one (the row does not exist yet; a duplicate would 409
      // server-side, but the UI must not even offer the other path).
      // The alt travels only with a hero of EITHER kind (the pairing rule
      // guarantees: hasHero -> alt non-blank, !hasHero -> alt blank); the
      // post-level hero fields are deliberately absent from the payload.
      this.save.emit({
        id: post.id,
        createTranslation: {
          locale: translationTarget,
          title,
          ...(slug === '' ? {} : { slug }),
          body,
          heroImageAlt: hasHero ? alt : null,
        },
      });
      return;
    }
    if (post === null) {
      const status = this.form.get('status')?.value ?? 'DRAFT';
      // A create-mode draft save: the consequence notice follows the
      // emission (a draft save must never be silent about its outcome).
      this.draftSaved.set(status === 'DRAFT');
      this.save.emit({ id: null, create: { ...common, status } });
    } else {
      // Saving a draft leaves it a draft (the PUT body carries no
      // status) — the notice follows it the same way.
      this.draftSaved.set(post.status === 'DRAFT');
      this.save.emit({ id: post.id, update: common });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
