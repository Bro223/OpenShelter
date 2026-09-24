import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import { readFileSync } from 'node:fs';
import type {
  AdminGuidancePostDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  UpdateGuidancePostRequest,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { ApiError } from '../../core/api-error';
import type { QuillDelta } from '../../../vendor/quill/2.0.3/dist/quill.js';
import {
  GuidanceEditor,
  type GuidanceEditorSave,
  BODY_EDITOR_FORMATS,
  BODY_EDITOR_FORMAT_TAGS,
  SNOW_THEME_HREF,
  bodyHtmlBlankValidator,
  heroImportUrlValidator,
  slugShapeValidator,
} from './guidance-editor';

// ---- fixtures ----------------------------------------------------------------

const MEDIA_ASSETS: MediaAssetDto[] = [
  {
    id: 5,
    url: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    storedFilename: '0123456789abcdef0123456789abcdef.jpg',
    originalFilename: 'kelder.jpg',
    contentType: 'image/jpeg',
    width: 1600,
    height: 900,
    sizeBytes: 204800,
    createdAt: '2026-09-01T09:00:00Z',
    reusedBy: 1,
  },
  {
    id: 6,
    url: '/api/media/fedcba9876543210fedcba9876543210.png',
    storedFilename: 'fedcba9876543210fedcba9876543210.png',
    originalFilename: 'maapilt.png',
    contentType: 'image/png',
    width: 800,
    height: 600,
    sizeBytes: 51200,
    createdAt: '2026-09-02T09:00:00Z',
    reusedBy: 0,
  },
];

const EDIT_POST: AdminGuidancePostDto = {
  id: 11,
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: '<p>Pöördu peavarjendisse.</p>',
  locale: 'et',
  homeLocale: 'et',
  status: 'PUBLISHED',
  pinned: true,
  sortOrder: 1,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  heroImportUrl: null,
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

/** The edit-mode DRAFT counterpart of EDIT_POST (the draft-state tests). */
const DRAFT_POST: AdminGuidancePostDto = { ...EDIT_POST, id: 12, status: 'DRAFT' };

/** A DRAFT with no hero at all — the "no image" tick's checked state. */
const NO_HERO_DRAFT: AdminGuidancePostDto = {
  ...DRAFT_POST,
  heroImageId: null,
  heroImageUrl: null,
  heroImageAlt: null,
  heroImportUrl: null,
};

/** A DRAFT carrying a hero import URL whose import FAILED at save
 *  (guidance-hero-import, the save-time trigger): the post was stored
 *  anyway (no asset yet), the URL kept for a retry. */
const PENDING_IMPORT_DRAFT: AdminGuidancePostDto = {
  ...DRAFT_POST,
  heroImageId: null,
  heroImageUrl: null,
  heroImageAlt: 'Kelder, vaade sissepääsust',
  heroImportUrl: 'https://cdn.example.com/kelder.jpg',
};

const NEW_ASSET: MediaAssetDto = {
  id: 7,
  url: '/api/media/0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f.webp',
  storedFilename: '0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f.webp',
  originalFilename: 'varjund.webp',
  contentType: 'image/webp',
  width: 1200,
  height: 800,
  sizeBytes: 102400,
  createdAt: '2026-09-03T09:00:00Z',
  reusedBy: 0,
};
/** The host: post null = create mode, a post = edit mode (the prefill runs
 *  in the editor's ngOnInit — so the inputs are set BEFORE the first
 *  detectChanges, like the page binds them). `error` is a REAL signal:
 *  the app runs zoneless, so a plain host property would not re-render
 *  the child's serverError input after creation (the repo's zoneless
 *  spec convention). */
@Component({
  imports: [GuidanceEditor],
  template: `<app-guidance-editor
    [post]="post"
    [mediaAssets]="assets"
    [busy]="busy"
    [serverError]="error()"
    [translationTarget]="target"
    [translationEditMode]="editMode"
    (save)="onSave($event)"
    (cancel)="cancelled = true"
  />`,
})
class Host {
  post: AdminGuidancePostDto | null = EDIT_POST;
  assets: MediaAssetDto[] | null = MEDIA_ASSETS;
  /** The translation-authoring locale (bilingual-guidance); null = the
   *  ordinary create/edit form (set BEFORE the first detectChanges, like
   *  the page binds it — the branch switch recreates the editor). */
  target: string | null = null;
  /** The translation-EDIT locale (the existing row is edited in place —
   *  the page fetched the post scoped to this locale already); null =
   *  not in translation-edit mode. */
  editMode: string | null = null;
  busy = false;
  error = signal<string | null>(null);
  lastSave: GuidanceEditorSave | null = null;
  cancelled = false;
  onSave(event: GuidanceEditorSave): void {
    this.lastSave = event;
  }
}

interface EditorHarness {
  host: Host;
  editor: GuidanceEditor;
  element: HTMLElement;
  fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  admin: FakeAdminGateway;
}

// ---- hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics) ----

class FakeAdminGateway {
  uploadMediaAsset = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

function createHost(
  post: AdminGuidancePostDto | null = EDIT_POST,
  assets: MediaAssetDto[] | null = MEDIA_ASSETS,
  target: string | null = null,
  editMode: string | null = null,
): EditorHarness {
  const admin = new FakeAdminGateway();
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [{ provide: AdminGateway, useValue: admin }],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.post = post;
  fixture.componentInstance.assets = assets;
  fixture.componentInstance.target = target;
  fixture.componentInstance.editMode = editMode;
  fixture.detectChanges();
  const debug = fixture.debugElement.query(By.directive(GuidanceEditor))!;
  if (!debug) {
    throw new Error('GuidanceEditor not rendered');
  }
  return {
    host: fixture.componentInstance,
    editor: debug.componentInstance as GuidanceEditor,
    element: debug.nativeElement as HTMLElement,
    fixture,
    admin,
  };
}

function inputById(root: HTMLElement, id: string): HTMLInputElement | HTMLTextAreaElement | null {
  return root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => (b.textContent ?? '').trim() === text,
    ) ?? null
  );
}

/** Set a reactive control's value through the DOM (the page-spec
 *  convention: dispatch 'input', then change detection). For #ge-body the
 *  "input" is the value seam Quill's root exposes (the setter loads the
 *  markup into the editor). */
function typeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  fx: { detectChanges(): void },
): void {
  el.value = value;
  el.dispatchEvent(new Event('input'));
  fx.detectChanges();
}

/** Fill the required title + body (create-mode tests start blank). */
function fillRequired(h: EditorHarness, title = 'Uus post', body = '<p>Keha</p>'): void {
  typeValue(inputById(h.element, 'ge-title')!, title, h.fixture);
  typeValue(inputById(h.element, 'ge-body')!, body, h.fixture);
}

/** Drive the file input the way a real selection would: set `files`
 *  (a plain array — the page-spec convention) and dispatch 'change'. */
function selectFile(input: HTMLInputElement, file: File): void {
  // configurable: the busy-block test selects twice on the same input.
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

/** Let in-flight gateway promises + zone work settle, then re-detect
 *  (the page-spec settle shape). */
async function settle(fixture: {
  whenStable(): Promise<unknown>;
  detectChanges(): void;
}): Promise<void> {
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

// ---- the Quill seam (the spec drives the editor the way a user would) --------

/** The editor instance (created in ngAfterViewInit — always present after
 *  the harness's first detectChanges). */
function quillOf(h: EditorHarness): NonNullable<GuidanceEditor['quill']> {
  const quill = h.editor.quill;
  if (quill === null) {
    throw new Error('the editor was not initialised (ngAfterViewInit)');
  }
  return quill;
}

/** The editable root (the #ge-body element, inside the Quill container). */
function rootOf(h: EditorHarness): HTMLElement {
  return quillOf(h).root;
}

/** Run `fn` with the link prompt stubbed (jsdom's real prompt is a
 *  no-op console warning). */
function withPrompt<T>(url: string | null, fn: () => T): T {
  const original = window.prompt;
  window.prompt = vi.fn().mockReturnValue(url) as typeof window.prompt;
  try {
    return fn();
  } finally {
    window.prompt = original;
  }
}

// ---- the standard toolbar (Quill builds it — the specs drive it the way
// ---- a user would: item clicks on the pickers, button clicks) ------------

/** The standard toolbar's inline buttons (the snow theme builds them from
 *  the config form with the standard control classes). */
function toolButton(root: HTMLElement, format: 'bold' | 'italic' | 'link'): HTMLButtonElement {
  const btn = root.querySelector<HTMLButtonElement>(`.ql-toolbar .ql-${format}`);
  if (btn === null) {
    throw new Error(`toolbar control .ql-${format} not built`);
  }
  return btn;
}

/** The list-kind button (bullet/ordered) — both are `ql-list` buttons,
 *  distinguished by their value attribute. */
function listButton(root: HTMLElement, kind: 'bullet' | 'ordered'): HTMLButtonElement {
  const btn = root.querySelector<HTMLButtonElement>(`.ql-toolbar .ql-list[value="${kind}"]`);
  if (btn === null) {
    throw new Error(`toolbar control .ql-list[value="${kind}"] not built`);
  }
  return btn;
}

/** Apply a header choice from the standard picker: clicking the item is
 *  the user path (the item's own click listener selects it and fires the
 *  toolbar's change). `value` '' = the default (paragraph) item, which
 *  carries no data-value. */
function pickHeader(h: EditorHarness, value: string): void {
  const item =
    value === ''
      ? h.element.querySelector<HTMLSpanElement>(
          '.ql-header.ql-picker .ql-picker-item:not([data-value])',
        )
      : h.element.querySelector<HTMLSpanElement>(
          `.ql-header.ql-picker .ql-picker-item[data-value="${value}"]`,
        );
  if (item === null) {
    throw new Error(`header picker item ${value === '' ? '(default)' : value} not built`);
  }
  item.click();
  h.fixture.detectChanges();
}

/** The tags the sanitizer keeps — the submitted value must contain ONLY
 *  these, no disallowed attributes, and a[href] restricted to http/https/
 *  mailto. Checked via DOMParser (no innerHTML). */
const ALLOWLIST_TAGS = new Set([
  'p',
  'h2',
  'h3',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
]);
function assertCleanBody(html: string): void {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const offenders: string[] = [];
  doc.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWLIST_TAGS.has(tag)) {
      offenders.push(`<${tag}>`);
    }
    el.getAttributeNames().forEach((name) => {
      if (!(tag === 'a' && name === 'href')) {
        offenders.push(`<${tag} ${name}=`);
      }
    });
  });
  doc.body.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (href !== '' && !/^(https?|mailto):/i.test(href)) {
      offenders.push(`href=${href}`);
    }
  });
  expect(offenders, `disallowed markup in ${html}`).toEqual([]);
}

/** Save and return the submitted body (create or update). */
function submittedBody(h: EditorHarness): string {
  h.editor.onSave();
  h.fixture.detectChanges();
  return h.host.lastSave?.create?.body ?? h.host.lastSave?.update?.body ?? '';
}

/** The format names a converted (pasted/loaded) delta carries. */
function deltaFormats(delta: QuillDelta): Set<string> {
  const out = new Set<string>();
  for (const op of delta.ops) {
    for (const key of Object.keys(op.attributes ?? {})) {
      out.add(key);
    }
  }
  return out;
}

/** The link hrefs a converted delta carries. */
function deltaLinks(delta: QuillDelta): string[] {
  return delta.ops
    .map((op) => op.attributes?.['link'])
    .filter((value): value is string => typeof value === 'string');
}

describe('GuidanceEditor', () => {
  // ---- create mode: prefill + the submit payload ---------------------------

  it('create mode starts blank (status DRAFT, no hero) and Save emits the create payload', () => {
    const h = createHost(null);
    expect(h.editor.form.get('title')?.value).toBe('');
    expect(h.editor.form.get('body')?.value).toBe('');
    expect(h.editor.form.get('status')?.value).toBe('DRAFT');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
    // A new post is hero-less: the "no image" tick starts checked.
    expect(h.editor.form.get('noHero')?.value).toBe(true);

    fillRequired(h, 'Varjumine droonirünnaku ajal', '<p>Pöördu peavarjendisse.</p>');
    typeValue(inputById(h.element, 'ge-locale')!, 'et', h.fixture);
    (inputById(h.element, 'ge-pinned') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBeNull();
    expect(h.host.lastSave?.create).toEqual<CreateGuidancePostRequest>({
      title: 'Varjumine droonirünnaku ajal',
      body: '<p>Pöördu peavarjendisse.</p>',
      locale: 'et',
      pinned: true,
      heroImageId: null,
      heroImageAlt: null,
      status: 'DRAFT',
    });
    // The blank slug is OMITTED (the server derives it from the title).
    expect(h.host.lastSave?.create).not.toHaveProperty('slug');
  });

  it('Save trims the title (the backend sees no leading/trailing whitespace)', () => {
    const h = createHost(null);
    fillRequired(h, '  Varjumine droonirünnaku ajal  ');
    h.editor.onSave();
    expect(h.host.lastSave?.create?.title).toBe('Varjumine droonirünnaku ajal');
  });

  it('a blank/whitespace title is blocked with the required copy (nothing emitted)', () => {
    const h = createHost(null);
    fillRequired(h, '   ', '<p>Keha</p>');
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('A title is required.');
  });

  it('Save (create) with the publish choice emits status PUBLISHED (one-shot write-and-publish)', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-status-published') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();

    expect(h.host.lastSave?.id).toBeNull();
    expect(h.host.lastSave?.create?.status).toBe('PUBLISHED');
  });

  it('an explicit slug that breaks the generated shape is blocked with the shape copy', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-slug')!, 'Minu post!', h.fixture);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain(
      'Use lowercase letters, numbers and dashes (no leading or trailing dash).',
    );
  });

  it('a valid explicit slug is sent verbatim in the create payload', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-slug')!, 'minu-post', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.create?.slug).toBe('minu-post');
  });

  // ---- the hero/alt cross-field rule (the server's 400, shown up front) ----

  it('choosing a hero with a blank alt blocks Save with the altRequired copy; the alt unblocks', () => {
    const h = createHost(null);
    fillRequired(h);

    // The "no image" tick starts checked (a new post is hero-less) — the
    // choice controls are disabled until it is unchecked.
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();

    // Open the picker and select the first asset.
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    const items = h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item');
    expect(items.length).toBe(2);
    items[0]!.click();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);

    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();

    // Filling the alt unblocks (the rule resolves both ways).
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder, vaade sissepääsust', h.fixture);
    expect(save?.disabled).toBe(false);
    h.editor.onSave();
    expect(h.host.lastSave?.create?.heroImageId).toBe(5);
    expect(h.host.lastSave?.create?.heroImageAlt).toBe('Kelder, vaade sissepääsust');
  });

  it('an alt without a hero is blocked with the altForbidden copy (the 400, both directions)', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-alt')!, 'Ilma pildita', h.fixture);

    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');

    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
  });

  it('removing the hero (with a typed alt) blocks Save again — the rule holds in both directions', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder', h.fixture);
    // The user's way (real clicks — what schedules change detection in a
    // zoneless OnPush component): uncheck the tick, open the picker, pick
    // the asset, then remove it via the card's Remove button.
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item')[0]!.click();
    h.fixture.detectChanges();
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();

    buttonByText(h.element, 'Remove image')!.click();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
  });

  // ---- hero import URL + the "no image" tick (guidance-hero-import) ----------
  // The URL is a PENDING import: stored with the draft, fetched/validated/
  // stored by the server at the next publish (or in the one-shot PUBLISHED
  // create). The copy for the new labels/notes is owned by the i18n lane
  // (the keys land in the same wave), so these specs assert STRUCTURE and
  // payloads, not the new copy text.

  it('heroImportUrlValidator: blank passes; absolute http(s) with a host passes; non-http(s), hostless, credentialed and relative fail', () => {
    const control = new FormControl('', {
      nonNullable: true,
      validators: [heroImportUrlValidator],
    });
    // Blank = no pending import (always allowed).
    expect(heroImportUrlValidator(control)).toBeNull();
    for (const good of [
      'https://example.com/a.jpg',
      'http://example.com',
      'https://sub.example.com:8443/a/b.png?x=1#y',
    ]) {
      control.setValue(good);
      expect(heroImportUrlValidator(control)).toBeNull();
    }
    for (const bad of [
      'ftp://example.com/a.jpg',
      'javascript:alert(1)',
      'https://',
      'https://user:pass@example.com/a.jpg',
      'a.jpg',
    ]) {
      control.setValue(bad);
      expect(heroImportUrlValidator(control)).not.toBeNull();
    }
  });

  it('a typed URL + alt is carried in the create payload as a pending import (no library id)', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck the tick
    h.fixture.detectChanges();
    typeValue(
      inputById(h.element, 'ge-hero-import-url')!,
      'https://cdn.example.com/kelder.jpg',
      h.fixture,
    );
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder, vaade sissepääsust', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.id).toBeNull();
    expect(h.host.lastSave?.create?.heroImportUrl).toBe('https://cdn.example.com/kelder.jpg');
    expect(h.host.lastSave?.create?.heroImageId).toBeNull();
    expect(h.host.lastSave?.create?.heroImageAlt).toBe('Kelder, vaade sissepääsust');
  });

  it('save-and-publish with a URL: the one-shot create carries the URL (the server imports it in the create call)', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    typeValue(
      inputById(h.element, 'ge-hero-import-url')!,
      'https://cdn.example.com/kelder.jpg',
      h.fixture,
    );
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder', h.fixture);
    (inputById(h.element, 'ge-status-published') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();

    expect(h.host.lastSave?.create?.status).toBe('PUBLISHED');
    expect(h.host.lastSave?.create?.heroImportUrl).toBe('https://cdn.example.com/kelder.jpg');
  });

  it('a URL without an alt blocks Save with the altRequired copy (the pairing rule covers the URL)', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    typeValue(
      inputById(h.element, 'ge-hero-import-url')!,
      'https://cdn.example.com/kelder.jpg',
      h.fixture,
    );
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
  });

  it('an invalid URL blocks Save (no payload) and shows the field-error line', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();
    const urlInput = inputById(h.element, 'ge-hero-import-url') as HTMLInputElement;

    // A valid URL first (the control is valid)...
    typeValue(urlInput, 'https://cdn.example.com/kelder.jpg', h.fixture);
    expect(h.editor.form.get('heroImportUrl')?.valid).toBe(true);
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder', h.fixture);

    // ...then a malformed one: the validator refuses (non-http(s), no
    // host, credentials) and Save emits nothing (the server's 400 is
    // mirrored up front).
    for (const bad of [
      'ftp://cdn.example.com/kelder.jpg',
      'https://',
      'https://user:pass@cdn.example.com/kelder.jpg',
    ]) {
      typeValue(urlInput, bad, h.fixture);
      expect(h.editor.form.get('heroImportUrl')?.valid).toBe(false);
      h.editor.onSave();
      expect(h.host.lastSave).toBeNull();
    }
    // The error line renders from the touched state (the copy lands with
    // the i18n lane's keys — assert the element, not the text).
    expect(h.element.querySelector('.guidance-editor__hero-import .field-error')).not.toBeNull();
  });

  // ---- the save-time import's failure (guidance-hero-import) ----
  // The write response can carry heroImportError: the save stored the
  // post anyway, the image import failed AT SAVE. The failure is shown
  // against the hero URL field (lead-in + the server's message), and
  // editing the URL clears the stale error (the next save retries).

  it('a write response with heroImportError shows the failure against the hero URL field', () => {
    const h = createHost({
      ...PENDING_IMPORT_DRAFT,
      heroImportError:
        'The hero image URL answered HTTP 404 (the URL is broken — no retry will fix it)',
    });
    const block = h.element.querySelector('.guidance-editor__hero-import')!;
    // The lead-in and the server's message, as field-errors on the block.
    const errors = Array.from(block.querySelectorAll('.field-error')).map((el) =>
      el.textContent?.trim(),
    );
    expect(errors).toContain(
      'The post was saved, but the hero image could not be fetched from this URL. Check the URL and save again to retry, or clear the field to continue without a hero:',
    );
    expect(errors).toContain(
      'The hero image URL answered HTTP 404 (the URL is broken — no retry will fix it)',
    );
  });

  it('editing the URL clears the stale import-failure error (the next save retries)', () => {
    const h = createHost({
      ...PENDING_IMPORT_DRAFT,
      heroImportError: 'The host serving the hero image answered HTTP 500 (a retry may succeed)',
    });
    expect(h.element.textContent).toContain(
      'The post was saved, but the hero image could not be fetched from this URL. Check the URL and save again to retry, or clear the field to continue without a hero:',
    );
    typeValue(
      inputById(h.element, 'ge-hero-import-url')!,
      'https://cdn.example.com/other.jpg',
      h.fixture,
    );
    h.fixture.detectChanges();
    expect(h.element.textContent).not.toContain(
      'The post was saved, but the hero image could not be fetched from this URL. Check the URL and save again to retry, or clear the field to continue without a hero:',
    );
  });

  it('a plain read (no heroImportError) shows no import-failure line', () => {
    const h = createHost(PENDING_IMPORT_DRAFT);
    expect(h.element.textContent).not.toContain(
      'The post was saved, but the hero image could not be fetched from this URL. Check the URL and save again to retry, or clear the field to continue without a hero:',
    );
  });

  it('a draft without a hero: the "no image" tick is visible and CHECKED (the saved state); the choice controls are disabled', () => {
    const h = createHost(NO_HERO_DRAFT);
    const tick = inputById(h.element, 'ge-hero-none') as HTMLInputElement;
    expect(tick).not.toBeNull(); // visible in edit mode
    expect(tick.checked).toBe(true);
    expect(buttonByText(h.element, 'Choose from the media library')!.disabled).toBe(true);
    expect((inputById(h.element, 'ge-hero-upload') as HTMLInputElement).disabled).toBe(true);
    expect((inputById(h.element, 'ge-hero-import-url') as HTMLInputElement).disabled).toBe(true);

    // Save as-is: the no-hero state round-trips (no hero fields at all).
    h.editor.onSave();
    expect(h.host.lastSave?.id).toBe(12);
    expect(h.host.lastSave?.update?.heroImageId).toBeNull();
    expect(h.host.lastSave?.update?.heroImageAlt).toBeNull();
    expect(h.host.lastSave?.update).not.toHaveProperty('heroImportUrl');
  });

  it('a draft WITH a pending import: the tick is unchecked, the URL prefills, and Save round-trips the URL', () => {
    const h = createHost(PENDING_IMPORT_DRAFT);
    expect((inputById(h.element, 'ge-hero-none') as HTMLInputElement).checked).toBe(false);
    expect(h.editor.form.get('heroImportUrl')?.value).toBe('https://cdn.example.com/kelder.jpg');

    h.editor.onSave();
    expect(h.host.lastSave?.id).toBe(12);
    expect(h.host.lastSave?.update?.heroImportUrl).toBe('https://cdn.example.com/kelder.jpg');
    expect(h.host.lastSave?.update?.heroImageId).toBeNull();
  });

  it('a post WITH a stored hero: the tick is unchecked (the saved state is a hero)', () => {
    const h = createHost(EDIT_POST);
    expect((inputById(h.element, 'ge-hero-none') as HTMLInputElement).checked).toBe(false);
  });

  it('checking the "no image" tick clears EVERY hero choice (asset, URL, alt) and disables the controls', () => {
    const h = createHost(PENDING_IMPORT_DRAFT);
    // The strongest "something is set" state: a stored hero AND a pending
    // URL. The hero is picked the USER's way (open the picker, click the
    // item) — the real click path is what schedules change detection.
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item')[0]!.click();
    h.fixture.detectChanges();
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();

    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();

    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
    expect(h.editor.form.get('heroImportUrl')?.value).toBe('');
    expect(h.editor.form.get('heroImageAlt')?.value).toBe('');
    expect(buttonByText(h.element, 'Choose from the media library')!.disabled).toBe(true);
    expect(h.element.querySelector('.guidance-editor__hero-current')).toBeNull();

    // The cleared state is saveable (the pairing rule: nothing set) — and
    // the omitted URL CLEARS the pending import on the server (full replace).
    h.editor.onSave();
    expect(h.host.lastSave?.update?.heroImageId).toBeNull();
    expect(h.host.lastSave?.update?.heroImageAlt).toBeNull();
    expect(h.host.lastSave?.update).not.toHaveProperty('heroImportUrl');
  });

  it('unchecking the tick re-enables the controls (nothing is restored)', () => {
    const h = createHost(NO_HERO_DRAFT);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck
    h.fixture.detectChanges();
    expect(buttonByText(h.element, 'Choose from the media library')!.disabled).toBe(false);
    expect((inputById(h.element, 'ge-hero-import-url') as HTMLInputElement).disabled).toBe(false);
    expect(h.editor.form.get('heroImageId')?.value).toBeNull(); // nothing restored
  });

  it('clearing the URL field clears the pending import on save (and the alt must clear too)', () => {
    const h = createHost(PENDING_IMPORT_DRAFT);
    typeValue(inputById(h.element, 'ge-hero-import-url')!, '', h.fixture);
    typeValue(inputById(h.element, 'ge-alt')!, '', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.update).not.toHaveProperty('heroImportUrl'); // cleared
    expect(h.host.lastSave?.update?.heroImageAlt).toBeNull();
  });

  it('selecting a library hero unchecks the tick (the tick never lies about a set hero)', () => {
    const h = createHost(NO_HERO_DRAFT);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck
    h.fixture.detectChanges();
    h.editor.selectHero(MEDIA_ASSETS[0]!);
    h.fixture.detectChanges();
    expect((inputById(h.element, 'ge-hero-none') as HTMLInputElement).checked).toBe(false);
  });

  // ---- edit mode: prefill + the update payload ------------------------------

  it('edit mode prefills from the post (title, stored body, hero, alt, locale, pinned, slug)', () => {
    const h = createHost(EDIT_POST);
    expect(h.editor.form.get('title')?.value).toBe(EDIT_POST.title);
    expect(h.editor.form.get('slug')?.value).toBe(EDIT_POST.slug);
    // The stored (sanitized) HTML is what the editor round-trips.
    expect(h.editor.form.get('body')?.value).toBe(EDIT_POST.bodyHtml);
    expect(h.editor.form.get('locale')?.value).toBe('et');
    expect(h.editor.form.get('pinned')?.value).toBe(true);
    expect(h.editor.form.get('heroImageId')?.value).toBe(5);
    expect(h.editor.form.get('heroImageAlt')?.value).toBe('Kelder, vaade sissepääsust');

    // The hero card shows the selected asset (the picker is closed).
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();
    // The status radios are ABSENT — the publication state is owned by the
    // row actions (the note explains it).
    expect(inputById(h.element, 'ge-status-published')).toBeNull();
    expect(h.element.textContent).toContain(
      'The publication state is changed with the Publish and Unpublish actions on the list.',
    );
    h.fixture.detectChanges();
  });

  it('Save (edit) emits {id, update} with NO status field (the PUT body)', () => {
    const h = createHost(EDIT_POST);
    // The prefill is already valid (hero + alt paired) — save as-is.
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update).toEqual<UpdateGuidancePostRequest>({
      title: EDIT_POST.title,
      slug: EDIT_POST.slug,
      body: EDIT_POST.bodyHtml,
      locale: 'et',
      pinned: true,
      heroImageId: 5,
      heroImageAlt: 'Kelder, vaade sissepääsust',
    });
    expect(h.host.lastSave?.update).not.toHaveProperty('status');
    expect(h.host.lastSave?.create).toBeUndefined();
  });

  it('a blanked slug in edit mode is OMITTED (the post keeps its current slug)', () => {
    const h = createHost(EDIT_POST);
    typeValue(inputById(h.element, 'ge-slug')!, '', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update).not.toHaveProperty('slug');
  });

  it('clearing the hero in edit mode emits heroImageId null + alt null', () => {
    const h = createHost(EDIT_POST);
    // Clearing the hero also blanks the alt (the pair stays consistent).
    buttonByText(h.element, 'Remove image')!.click();
    h.fixture.detectChanges();
    typeValue(inputById(h.element, 'ge-alt')!, '', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.update?.heroImageId).toBeNull();
    expect(h.host.lastSave?.update?.heroImageAlt).toBeNull();
  });

  // ---- picker states ---------------------------------------------------------

  it('the picker shows the loading line while the assets are null', () => {
    const h = createHost(null, null);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck the tick
    h.fixture.detectChanges();
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('Loading the media library…');
  });

  it('the picker shows the empty line for an empty library', () => {
    const h = createHost(null, []);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck the tick
    h.fixture.detectChanges();
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('No images in the media library yet');
  });

  // ---- the derivative srcset on the image slots ----------------------

  it('the picker items carry the derivative srcset when the asset has one (sizes = the 72 px slot)', () => {
    const withSrcset: MediaAssetDto[] = [
      {
        ...MEDIA_ASSETS[0]!,
        srcset:
          '/api/media/0123456789abcdef0123456789abcdef-t96.jpg 96w, ' +
          '/api/media/0123456789abcdef0123456789abcdef-t192.jpg 192w',
      },
      MEDIA_ASSETS[1]!, // no srcset (e.g. a WebP original)
    ];
    const h = createHost(null, withSrcset);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();

    const imgs = h.element.querySelectorAll<HTMLImageElement>('.hero-picker__item img');
    expect(imgs.length).toBe(2);
    expect(imgs[0]!.getAttribute('srcset')).toBe(withSrcset[0]!.srcset);
    expect(imgs[0]!.getAttribute('sizes')).toBe('72px');
    // An asset without derivatives: no srcset attribute — plain src only.
    expect(imgs[1]!.hasAttribute('srcset')).toBe(false);
  });

  it('the current hero thumb carries the derivative srcset of the picked asset', () => {
    const withSrcset: MediaAssetDto[] = [
      {
        ...MEDIA_ASSETS[0]!,
        srcset: '/api/media/0123456789abcdef0123456789abcdef-t96.jpg 96w',
      },
    ];
    const h = createHost(null, withSrcset);
    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click();
    h.fixture.detectChanges();
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item')[0]!.click();
    h.fixture.detectChanges();

    const thumb = h.element.querySelector<HTMLImageElement>('.guidance-editor__hero-thumb');
    expect(thumb?.getAttribute('srcset')).toBe(withSrcset[0]!.srcset);
    expect(thumb?.getAttribute('sizes')).toBe('56px');
  });

  it('a stored hero not on the loaded library page degrades to plain src (no srcset)', () => {
    // heroImageId 5 is stored, but the library page is empty — the post
    // fallback branch has no srcset to offer (documented degradation).
    const h = createHost(EDIT_POST, []);
    const thumb = h.element.querySelector<HTMLImageElement>('.guidance-editor__hero-thumb');
    expect(thumb?.getAttribute('src')).toBe(EDIT_POST.heroImageUrl);
    expect(thumb?.hasAttribute('srcset')).toBe(false);
  });

  it('Cancel emits cancel (the page closes the editor and keeps no draft)', () => {
    const h = createHost(null);
    buttonByText(h.element, 'Cancel')!.click();
    h.fixture.detectChanges();
    expect(h.host.cancelled).toBe(true);
  });

  // ---- hero upload (the picker's inline upload — no library detour) -------

  it('upload: choosing a file calls the gateway and auto-selects the new asset', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockResolvedValue(NEW_ASSET);
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp');
    const file = new File(['x'.repeat(102400)], 'varjund.webp', { type: 'image/webp' });

    selectFile(input, file);
    await settle(h.fixture);

    expect(h.admin.uploadMediaAsset).toHaveBeenCalledWith(file);
    expect(h.editor.form.get('heroImageId')?.value).toBe(NEW_ASSET.id);
    // The current-image card shows the new asset; the picker closed
    // (no second click needed).
    const thumb = h.element.querySelector<HTMLImageElement>('.guidance-editor__hero-current img');
    expect(thumb?.getAttribute('src')).toBe(NEW_ASSET.url);
    expect(h.element.querySelector('.hero-picker')).toBeNull();
    // The picker list refreshed: the new asset is FIRST (newest first).
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    const items = h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item');
    expect(items.length).toBe(3);
    expect(items[0]!.textContent).toContain('varjund.webp');
  });

  it('upload: the busy state blocks a second upload (the input is disabled, one gateway call)', async () => {
    const h = createHost(null);
    let resolveUpload: (asset: MediaAssetDto) => void = () => undefined;
    h.admin.uploadMediaAsset.mockReturnValue(
      new Promise<MediaAssetDto>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });

    selectFile(input, fileA);
    h.fixture.detectChanges();
    expect(h.editor.uploading()).toBe(true);
    expect(input.disabled).toBe(true);

    // A second selection while in flight is ignored (the guard, not the
    // disabled attribute, is what enforces it).
    selectFile(input, fileB);
    h.fixture.detectChanges();
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledWith(fileA);

    resolveUpload(NEW_ASSET);
    await settle(h.fixture);
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(false);
    expect(h.editor.form.get('heroImageId')?.value).toBe(NEW_ASSET.id);
  });

  it('upload: a 413 shows the cap message and selects nothing (the form is untouched)', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(
      apiError(413, 'image exceeds the 5 MB cap', '/admin/media'),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    (inputById(h.element, 'ge-hero-none') as HTMLInputElement).click(); // uncheck the tick
    h.fixture.detectChanges();
    selectFile(input, new File(['x'.repeat(51200)], 'big.png', { type: 'image/png' }));
    await settle(h.fixture);

    // The MAPPED message names the cap (the server text is not echoed).
    expect(h.element.textContent).toContain('That image is larger than the 5 MB upload cap.');
    expect(h.element.textContent).not.toContain('image exceeds the 5 MB cap');
    // No partial state: nothing selected, the picker list unchanged,
    // the input reset (the same file stays re-selectable).
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
    expect(input.value).toBe('');
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.querySelectorAll('.hero-picker__item').length).toBe(2);
  });

  it('upload: a 400 shows the unsupported-type message (no server echo)', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(
      apiError(400, 'file is not a readable image', '/admin/media'),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'], 'mitte-pilt.webp', { type: 'image/webp' }));
    await settle(h.fixture);

    expect(h.element.textContent).toContain(
      'That file is not a supported image (JPEG, PNG or WebP), or its type does not match.',
    );
    expect(h.element.textContent).not.toContain('file is not a readable image');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
  });

  it('upload: an unhandled failure (5xx) shows the generic retry copy', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(apiError(500, 'internal error', '/admin/media'));
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'], 'a.png', { type: 'image/png' }));
    await settle(h.fixture);

    expect(h.element.textContent).toContain('The image upload failed. Please try again.');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
  });

  it('upload: the alt-required rule applies after an auto-selected hero', async () => {
    const h = createHost(null);
    fillRequired(h);
    h.admin.uploadMediaAsset.mockResolvedValue(NEW_ASSET);
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'.repeat(102400)], 'varjund.webp', { type: 'image/webp' }));
    await settle(h.fixture);

    // Exactly as picking from the library: hero set + blank alt = the
    // altRequired copy, Save blocked; the alt unblocks.
    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();

    typeValue(inputById(h.element, 'ge-alt')!, 'Varjund, vaade seest', h.fixture);
    expect(save?.disabled).toBe(false);
    h.editor.onSave();
    expect(h.host.lastSave?.create?.heroImageId).toBe(NEW_ASSET.id);
    expect(h.host.lastSave?.create?.heroImageAlt).toBe('Varjund, vaade seest');
  });

  // ---- the visual body editor (Quill 2 over the sanitizer's allowlist) -----

  it('round-trips the stored HTML unchanged: load puts the markup in, Save submits the same string', () => {
    const h = createHost({ ...EDIT_POST, bodyHtml: '<h2>X</h2><p>Y</p>' });
    const root = rootOf(h);
    // The stored (sanitized) markup goes in as markup, not escaped text.
    expect(root.innerHTML).toBe('<h2>X</h2><p>Y</p>');
    // The form's body control carries the document (the value seam reads
    // it back — the same surface the page spec drives).
    expect(inputById(h.element, 'ge-body')!.value).toBe('<h2>X</h2><p>Y</p>');

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update?.body).toBe('<h2>X</h2><p>Y</p>');
  });

  it('a stored blockquote still round-trips (the normalizer keeps it even without a toolbar choice)', () => {
    const h = createHost({
      ...EDIT_POST,
      bodyHtml: '<p>a</p><blockquote>quoted</blockquote><p>b</p>',
    });
    const root = rootOf(h);
    // The stored blockquote loads as markup (the normalizer does not unwrap it).
    expect(root.innerHTML).toBe('<p>a</p><blockquote>quoted</blockquote><p>b</p>');

    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.update?.body).toBe('<p>a</p><blockquote>quoted</blockquote><p>b</p>');
  });

  it('the toolbar offers exactly the sanitizer allowlist (Quote is not offered — the owner removed the choice)', () => {
    const h = createHost(null);
    fillRequired(h);
    const toolbar = h.element.querySelector('[role="toolbar"]');
    expect(toolbar, 'the snow theme builds the standard toolbar').not.toBeNull();

    // The header picker offers the default paragraph plus levels 2 and 3
    // only (no H1 — the page owns it; no H4-h6 — not on the allowlist).
    const headerValues = [
      ...h.element.querySelectorAll<HTMLElement>('.ql-header.ql-picker .ql-picker-item'),
    ].map((i) => i.getAttribute('data-value') ?? '');
    expect(headerValues).toEqual(['2', '3', '']);

    // The remaining controls, in DOM order: the two list buttons and the
    // three inline buttons — the standard control classes, nothing else.
    expect(
      [...h.element.querySelectorAll<HTMLButtonElement>('.ql-toolbar button')].map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['list: bullet', 'list: ordered', 'bold', 'italic', 'link']);

    // No control for a format the sanitizer does not keep, or the owner
    // removed (Quote): the toolbar IS the feature set.
    for (const format of ['quote', 'blockquote', 'underline', 'clean', 'code-block', 'image']) {
      expect(toolbar!.querySelector(`.ql-${format}`), `no .ql-${format} control`).toBeNull();
    }
  });

  it('choosing a block type applies the expected tag (Heading 2 → <h2>, Heading 3 → <h3>, Paragraph back)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const quill = quillOf(h);
    const root = rootOf(h);
    const length = quill.getText(0, quill.getLength() - 1).length;

    quill.setSelection(0, length);
    pickHeader(h, '2');
    expect(root.innerHTML).toBe('<h2>Pöördu peavarjendisse.</h2>');
    expect(h.editor.form.get('body')?.value).toBe('<h2>Pöördu peavarjendisse.</h2>');

    quill.setSelection(0, length);
    pickHeader(h, '3');
    expect(root.innerHTML).toBe('<h3>Pöördu peavarjendisse.</h3>');

    quill.setSelection(0, length);
    pickHeader(h, '');
    expect(root.innerHTML).toBe('<p>Pöördu peavarjendisse.</p>');
  });

  it('the header picker pressed state reflects where the selection sits (Quill owns the state)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<h2>Pöördu peavarjendisse.</h2>');
    const quill = quillOf(h);
    quill.setSelection(0, 3);
    h.fixture.detectChanges();

    // The picker's label carries the current value (the upstream CSS
    // paints "Heading 2" from it) and the active class; the level-2 item
    // is the selected one, the default (paragraph) item is not.
    const label = h.element.querySelector('.ql-header.ql-picker .ql-picker-label')!;
    expect(label.getAttribute('data-value')).toBe('2');
    expect(label.classList.contains('ql-active')).toBe(true);
    expect(
      h.element
        .querySelector('.ql-header.ql-picker .ql-picker-item[data-value="2"]')!
        .classList.contains('ql-selected'),
    ).toBe(true);
    expect(
      h.element
        .querySelector('.ql-header.ql-picker .ql-picker-item:not([data-value])')!
        .classList.contains('ql-selected'),
    ).toBe(false);
  });

  it('typing then formatting yields allowlist tags (the round-trip contract)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pealkiri siin</p>');
    const quill = quillOf(h);

    // Type (a user edit — Quill records it for undo).
    quill.insertText(quill.getLength() - 1, ' Ja veel.', 'user');
    // Bold the first word, then make the whole line a heading.
    quill.setSelection(0, 5);
    toolButton(h.element, 'bold').click();
    h.fixture.detectChanges();
    quill.setSelection(0, quill.getLength() - 1);
    pickHeader(h, '2');

    const body = submittedBody(h);
    expect(body).toBe('<h2><strong>Pealk</strong>iri siin Ja veel.</h2>');
    assertCleanBody(body);
  });

  it('Bold wraps the selection in <strong>; a second immediate Bold toggles it OFF (never <b>)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const bold = toolButton(h.element, 'bold');

    quill.setSelection(6, 5); // "brave"
    bold.click();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');
    expect(bold.getAttribute('aria-pressed')).toBe('true');

    // The selection stays on the formatted word — a repeat click is the
    // documented "the format ends" way.
    bold.click();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>hello brave world</p>');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(rootOf(h).innerHTML).not.toMatch(/<b>|<\/b>/);
  });

  it('Bold at a COLLAPSED caret toggles ON (the button reads active, the format is armed) then OFF (inactive, nothing left)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const bold = toolButton(h.element, 'bold');

    quill.setSelection(6); // the caret between "hello " and "brave"
    bold.click();
    h.fixture.detectChanges();
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(quill.getFormat(6, 0)['bold']).toBe(true);
    expect(rootOf(h).querySelector('strong')).not.toBeNull();

    bold.click();
    h.fixture.detectChanges();
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(quill.getFormat(6, 0)['bold']).toBeFalsy();
    expect(rootOf(h).querySelector('strong')).toBeNull();
    // Only the (invisible, normalizer-stripped) arming cursor may remain
    // in the text — no visible change.
    expect((rootOf(h).textContent ?? '').replace(/\uFEFF/g, '')).toBe('hello brave world');
  });

  it('Bold and Italic are independent: both nest, turning Italic OFF leaves Bold ON', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const bold = toolButton(h.element, 'bold');
    const italic = toolButton(h.element, 'italic');

    quill.setSelection(6, 5); // "brave"
    bold.click();
    h.fixture.detectChanges();
    italic.click();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>hello <strong><em>brave</em></strong> world</p>');
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(italic.getAttribute('aria-pressed')).toBe('true');

    // The selection is still on "brave" — Italic toggles off, Bold stays.
    italic.click();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(italic.getAttribute('aria-pressed')).toBe('false');
  });

  it('undo removes the last edit, redo restores it (Quill history)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>keha</p>');
    const quill = quillOf(h);

    quill.insertText(4, ' veel', 'user');
    expect(rootOf(h).innerHTML).toBe('<p>keha veel</p>');

    quill.history.undo();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>keha</p>');
    expect(h.editor.form.get('body')?.value).toBe('<p>keha</p>');

    quill.history.redo();
    h.fixture.detectChanges();
    expect(rootOf(h).innerHTML).toBe('<p>keha veel</p>');
  });

  it('a stored bulleted list round-trips clean, and the toolbar switches it to numbered', () => {
    const h = createHost({ ...EDIT_POST, bodyHtml: '<ul><li>one</li><li>two</li></ul>' });
    const quill = quillOf(h);
    const root = rootOf(h);

    // The list loads (Quill 2 renders every list as <ol> with
    // data-list items — the snow CSS paints the bullets; the WIRE value
    // is what must be semantic).
    expect(root.querySelectorAll('li').length).toBe(2);

    // The wire value is the clean allowlist — Quill's editing-time
    // bookkeeping (the ol container, data-list, the list UI span) is
    // remapped/stripped by the normalizer on Save.
    const body = submittedBody(h);
    expect(body).toBe('<ul><li>one</li><li>two</li></ul>');
    assertCleanBody(body);

    // Switch the kind over the whole list: the WIRE shape flips too.
    quill.setSelection(0, quill.getLength() - 1);
    listButton(h.element, 'ordered').click();
    h.fixture.detectChanges();
    const numbered = submittedBody(h);
    expect(numbered).toBe('<ol><li>one</li><li>two</li></ol>');
    assertCleanBody(numbered);
  });

  it('Ctrl+B and Ctrl+I apply strong/em (Quill keyboard module — never <b>/<i>)', () => {
    // Ctrl, not Cmd: jsdom reports a non-Mac platform, where Quill's
    // keyboard shortcut is Ctrl.
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const root = rootOf(h);

    quill.setSelection(6, 5);
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    h.fixture.detectChanges();
    expect(root.innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');

    quill.setSelection(6, 5);
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    h.fixture.detectChanges();
    expect(root.innerHTML).toContain('<em>');
    expect(root.innerHTML).not.toContain('<i>');
  });

  it('an empty editor counts as empty: Save is blocked with the bodyRequired copy', () => {
    const h = createHost(null);
    typeValue(inputById(h.element, 'ge-title')!, 'Uus post', h.fixture);
    // The document holds Quill's empty shape (<p><br></p>) — exactly as an
    // empty region did; the form carries the empty string.
    expect(rootOf(h).innerHTML).toBe('<p><br></p>');
    expect(h.editor.form.get('body')?.value).toBe('');

    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('A body is required.');
  });

  it('a block choice on an empty editor still counts as EMPTY (save stays blocked, body stays blank)', () => {
    const h = createHost(null);
    typeValue(inputById(h.element, 'ge-title')!, 'Uus post', h.fixture);
    quillOf(h).setSelection(0);
    pickHeader(h, '');

    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);
    expect(submittedBody(h)).toBe('');
    expect(h.element.textContent).toContain('A body is required.');
  });

  it('bodyHtmlBlankValidator: markup-only bodies (<p><br></p>, <br>) are blank; text is not', () => {
    const ctrl = (value: string): FormControl => new FormControl(value, { nonNullable: true });
    expect(bodyHtmlBlankValidator(ctrl(''))).toEqual({ blank: true });
    expect(bodyHtmlBlankValidator(ctrl('<p><br></p>'))).toEqual({ blank: true });
    expect(bodyHtmlBlankValidator(ctrl('<br>'))).toEqual({ blank: true });
    expect(bodyHtmlBlankValidator(ctrl('   '))).toEqual({ blank: true });
    expect(bodyHtmlBlankValidator(ctrl('<h2>X</h2><p>Y</p>'))).toBeNull();
  });

  // ---- the stylesheet wiring (loaded WITH the editor, never globally) ----

  it('the snow stylesheet is not a global style, and the asset copy that serves SNOW_THEME_HREF stays pinned (angular.json)', () => {
    // The one regression this file guards twice: the stylesheet must ride
    // in the lazy admin chunk, not in the initial bundle. The pin covers
    // BOTH halves of the wiring — the negative (no quill in `styles`) and
    // the positive (the assets entry that copies the vendored theme to the
    // URL the editor links). The positive half is the one the sweep's
    // mutation exposed: deleting the asset entry leaves this suite green
    // (jsdom creates the <link> regardless of whether the URL resolves)
    // while the BUILT app's editor loses its theme (404) — the exact bug
    // this guard class exists to catch.
    const config = JSON.parse(readFileSync(`${process.cwd()}/angular.json`, 'utf8')) as {
      projects: Record<
        string,
        {
          architect: Record<
            string,
            {
              options: {
                styles: string[];
                assets: (string | { glob: string; input: string; output: string })[];
              };
            }
          >;
        }
      >;
    };
    const options = config.projects['frontend']!.architect['build']!.options;
    expect(
      options.styles.some((s) => s.includes('quill')),
      'quill.snow.css must not be a global style',
    ).toBe(false);
    // The positive half: the entry that copies the vendored theme into the
    // build output. Resolved against the vendored version directory it must
    // land EXACTLY on SNOW_THEME_HREF — drift in the copy or in the href
    // 404s the theme in the built app with a green suite. (The vendor file
    // itself is pinned by the bytes test below, which fails if the
    // 2.0.3/dist path goes away.)
    const quillEntry = options.assets.find(
      (a): a is { glob: string; input: string; output: string } =>
        typeof a === 'object' &&
        a.input === 'src/vendor/quill' &&
        a.glob === '**/dist/quill.snow.css',
    );
    expect(
      quillEntry,
      'angular.json must copy the vendored quill snow theme into the build output — the editor links SNOW_THEME_HREF, and without the copy the built editor is unstyled (404) while this suite stays green',
    ).toBeDefined();
    expect(quillEntry!.output, 'the quill copy output root').toBe('/vendor/quill');
    expect(
      `${quillEntry!.output}/2.0.3/dist/quill.snow.css`,
      'the copied asset must land on the URL the editor links',
    ).toBe(SNOW_THEME_HREF);
  });

  it('initialising the editor loads the snow stylesheet (one versioned link, never global)', () => {
    // The wiring changed with the load mechanism (and this pin changed
    // with it, on purpose): the theme is neither inlined into the
    // component style (the anyComponentStyle budget is a 10 kB ERROR —
    // ~24 kB of vendor bytes would blow it; a dynamic .css import was
    // rejected empirically, the esbuild builder emits orphaned CSS files
    // no code injects) nor a global style (the angular.json pin above).
    // The editor's init injects ONE <link> per app to the VERSIONED
    // static asset the build copies verbatim from the vendor directory
    // (SNOW_THEME_HREF; the angular.json assets entry does the copy).
    createHost(null);
    // Exactly ONE — not "at least one": the tests above this one created
    // the editor many times over (this file's convention is one host per
    // test). If the link were injected per editor instance instead of
    // once per app, the count would be in the dozens by now — so the
    // exact count IS the once-per-app check.
    const themeLinks = [...document.head.querySelectorAll('link[rel="stylesheet"]')].filter(
      (l) => l.getAttribute('href') === SNOW_THEME_HREF,
    );
    expect(themeLinks.length, 'the editor init must link the snow theme exactly once').toBe(1);
    // The asset is made from the vendored bytes (fingerprint of
    // quill.snow.css: without the bullet-marker rule, every list renders
    // as numbers — Quill 2 draws the marker in the theme CSS, from the
    // li's .ql-ui span).
    const vendored = readFileSync(
      `${process.cwd()}/src/vendor/quill/2.0.3/dist/quill.snow.css`,
      'utf8',
    );
    expect(vendored, 'the vendored snow theme must carry the bullet-marker rule').toContain(
      'data-list=bullet',
    );
  });

  // ---- the link control (prompt + the allowlisted protocols) ----------------

  it('an allowed link is created with its href; the wire value is clean (no editing-time target/rel)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    quill.setSelection(6, 5); // "brave"

    withPrompt('https://example.com', () => {
      toolButton(h.element, 'link').click();
      h.fixture.detectChanges();
    });

    const anchor = rootOf(h).querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');

    const body = submittedBody(h);
    // Quill adds target/rel while editing (a new tab); the normalizer
    // strips them — the public page keeps links in the same tab, as before.
    expect(body).toBe('<p>hello <a href="https://example.com">brave</a> world</p>');
    assertCleanBody(body);
  });

  it('a valid mailto link is kept', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    quill.setSelection(6, 5);

    withPrompt('mailto:kontakt@example.ee', () => {
      toolButton(h.element, 'link').click();
      h.fixture.detectChanges();
    });

    expect(submittedBody(h)).toBe(
      '<p>hello <a href="mailto:kontakt@example.ee">brave</a> world</p>',
    );
  });

  it('a javascript: link is refused with the invalid-protocol copy and inserts nothing', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    quill.setSelection(6, 5);

    withPrompt('javascript:alert(1)', () => {
      toolButton(h.element, 'link').click();
      h.fixture.detectChanges();
    });

    expect(h.element.textContent).toContain('Only http, https and mailto links are kept');
    expect(rootOf(h).querySelector('a')).toBeNull();
    expect(rootOf(h).innerHTML).toBe('<p>hello brave world</p>');
  });

  it('a link with no selection is refused with the noSelection copy', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    // A collapsed caret is not a selection for the link contract.
    quill.setSelection(6);

    withPrompt('https://example.com', () => {
      toolButton(h.element, 'link').click();
      h.fixture.detectChanges();
    });

    expect(h.element.textContent).toContain('Select the text to link first.');
    expect(rootOf(h).querySelector('a')).toBeNull();
  });

  // ---- the conversion guard (default paste is RICH — the restricted
  // ---- registry + matchers drop everything the sanitizer does not keep) --

  it('the conversion guard drops disallowed formats from pasted/loaded markup (h1/h4, bad link protocols, task-list checkboxes)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello</p>');
    const quill = quillOf(h);

    const delta = quill.clipboard.convert({
      html:
        '<h1>too big</h1><h4>too small</h4>' +
        '<p>ok <b>bold</b> <i>italic</i></p>' +
        '<p><a href="javascript:alert(1)">bad</a> ' +
        '<a href="tel:+3725555555">phone</a> ' +
        '<a href="https://ok.ee">fine</a> ' +
        '<a href="relative/page">rel</a></p>' +
        '<ul><li data-checked="true">task</li></ul>',
    });

    // header is stripped entirely (h1/h4 are not values 2/3); the task
    // list degrades to a bullet; b/i map to the sanitizer's spellings;
    // only allowlisted (or relative) links survive.
    expect(deltaFormats(delta)).toEqual(new Set(['bold', 'italic', 'link', 'list']));
    expect(deltaLinks(delta)).toEqual(['https://ok.ee', 'relative/page']);

    // The same pipeline at the DOM level (the load path): the document
    // shows no h1 and no dead/bad anchors — and the wire stays clean.
    quill.clipboard.dangerouslyPasteHTML(
      '<h1>too big</h1><p>yes <a href="javascript:x">bad</a> <a href="https://ok.ee">fine</a></p>',
    );
    h.fixture.detectChanges();
    expect(rootOf(h).querySelector('h1')).toBeNull();
    expect(rootOf(h).querySelectorAll('a').length).toBe(1);
    expect(rootOf(h).querySelector('a')!.getAttribute('href')).toBe('https://ok.ee');
    assertCleanBody(submittedBody(h));
  });

  // ---- the durable guard (editor features ⊆ server sanitizer) --------------

  it('the editor formats list is a subset of the BodySanitizer allowlist (durable guard)', () => {
    // The sanitizer's tag set, mirrored from BodySanitizer.java's Safelist
    // (the elements + the a[href] attribute). If the server's allowlist
    // ever changes, this set changes with it — and the mapping below must
    // too, or the test fails.
    const SANITIZER_TAGS = new Set([
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

    // 1. The tag map covers EXACTLY the formats list (no orphan formats,
    //    no unguarded tags).
    expect(Object.keys(BODY_EDITOR_FORMAT_TAGS).sort()).toEqual([...BODY_EDITOR_FORMATS].sort());

    // 2. Every tag a format can produce is one the server keeps.
    const offenders: string[] = [];
    for (const [format, tags] of Object.entries(BODY_EDITOR_FORMAT_TAGS)) {
      for (const tag of tags) {
        if (!SANITIZER_TAGS.has(tag)) {
          offenders.push(`${format} -> <${tag}>`);
        }
      }
    }
    expect(offenders, 'editor formats producing tags the BodySanitizer would strip').toEqual([]);

    // 3. The header format is the one value-subset the formats list cannot
    //    express: the toolbar offers heading levels 2 and 3 only (plus the
    //    empty-valued paragraph button, which means "no heading").
    const headerValues = h_headerValues();
    expect(headerValues, 'the paragraph button carries the empty header value').toContain('');
    expect(
      headerValues.filter((value) => value !== ''),
      'the only heading levels offered are 2 and 3',
    ).toEqual(['2', '3']);
  });

  /** The header picker's offered values (read from the rendered toolbar,
   *  so a config edit that offers h1/h4-h6 fails the guard). The default
   *  (paragraph) item carries no data-value — it reads as ''. */
  function h_headerValues(): string[] {
    const h = createHost(null);
    return [...h.element.querySelectorAll<HTMLElement>('.ql-header.ql-picker .ql-picker-item')].map(
      (i) => i.getAttribute('data-value') ?? '',
    );
  }

  // ---- the draft consequence (a draft save is never silent) ---------------

  it('a create-mode draft save shows the "saved as a draft" notice (consequence + way out)', () => {
    const h = createHost(null);
    fillRequired(h);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain(
      'Saved as a draft. It is not visible on /blog until you publish it',
    );
  });

  it('the draft-save notice names the publish action (the way out)', () => {
    const h = createHost(null);
    fillRequired(h);

    h.editor.onSave();
    h.fixture.detectChanges();

    // The info treatment (a normal state, not the error banner).
    const notice = h.element.querySelector('.banner--info');
    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('Publish');
    expect(notice!.textContent).toContain('save and publish');
    expect(h.element.querySelector('.banner--error')).toBeNull();
  });

  it('a create-mode save-and-publish shows no draft notice', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-status-published') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('Saved as a draft.');
    expect(h.element.querySelector('.banner')).toBeNull();
  });

  it('editing a draft: the at-a-glance line shows on open, and saving shows the draft notice', () => {
    const h = createHost(DRAFT_POST);
    h.fixture.detectChanges();

    // At a glance (before any save): the state line names the consequence
    // and the way out (the published post's complementary note is gone).
    expect(h.element.textContent).toContain(
      'This post is a draft — it is not visible on /blog until you publish it',
    );
    expect(h.element.textContent).toContain('Publish');
    expect(h.element.textContent).not.toContain(
      'The publication state is changed with the Publish and Unpublish actions on the list.',
    );

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain(
      'Saved. It is still a draft, so it is not visible on /blog until you publish it',
    );
    const notice = h.element.querySelector('.banner--info');
    expect(notice!.textContent).toContain('Publish');
  });

  it('editing a published post keeps the complementary note and shows no draft notice (no nag)', () => {
    const h = createHost(EDIT_POST);
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('This post is a draft');
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('Saved as a draft.');
    expect(h.element.textContent).not.toContain('still a draft');
    expect(h.element.querySelector('.banner')).toBeNull();
  });

  it('a failed draft save shows the error banner, not the "saved as a draft" notice', () => {
    const h = createHost(null);
    fillRequired(h);
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('Saved as a draft.');

    // The parent keeps the editor open on a failed save (the server
    // message comes down through the serverError input).
    h.host.error.set('slug "uus-juhis" is already in use');
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('slug "uus-juhis" is already in use');
    expect(h.element.textContent).not.toContain('Saved as a draft.');
  });

  // ---- the slug validator (the shared unit) ----------------------------------

  it('slugShapeValidator allows blank and the generated shape, rejects the rest', () => {
    const ctrl = (value: string): FormControl => new FormControl(value, { nonNullable: true });
    expect(slugShapeValidator(ctrl(''))).toBeNull();
    expect(slugShapeValidator(ctrl('varjumine'))).toBeNull();
    expect(slugShapeValidator(ctrl('varjumine-droonirunnaku-ajal'))).toBeNull();
    expect(slugShapeValidator(ctrl('Minu post!'))).toEqual({ slug: true });
    expect(slugShapeValidator(ctrl('-leading'))).toEqual({ slug: true });
    expect(slugShapeValidator(ctrl('trailing-'))).toEqual({ slug: true });
  });
});

// ---- translation authoring (bilingual-guidance) ------------------------------
//
// The editor's THIRD mode: the page recreates it (the template branch)
// with the `translationTarget` locale — the form is prefilled from the
// on-screen row, the post-level fields are off it, and Save emits the
// create-translation payload (the CREATE endpoint — never update).

describe('translation authoring (bilingual-guidance)', () => {
  it('prefills from the on-screen row (title, body, alt; the slug BLANK) and Save emits the create-translation payload — never the update or create-post payloads', () => {
    const h = createHost(EDIT_POST, MEDIA_ASSETS, 'ru');
    expect(inputById(h.element, 'ge-title')!.value).toBe(EDIT_POST.title);
    expect(inputById(h.element, 'ge-slug')!.value).toBe('');
    expect(inputById(h.element, 'ge-alt')!.value).toBe(EDIT_POST.heroImageAlt);
    expect(rootOf(h).innerHTML).toContain('Pöördu peavarjendisse');
    h.editor.onSave();
    h.fixture.detectChanges();
    const save = h.host.lastSave;
    expect(save?.id).toBe(EDIT_POST.id);
    expect(save?.update).toBeUndefined();
    expect(save?.create).toBeUndefined();
    expect(save?.createTranslation).toEqual({
      locale: 'ru',
      title: EDIT_POST.title,
      body: EDIT_POST.bodyHtml,
      heroImageAlt: EDIT_POST.heroImageAlt,
    });
  });

  it('a typed slug is carried in the payload; a blank slug is omitted (the server generates one)', () => {
    const h = createHost(EDIT_POST, MEDIA_ASSETS, 'ru');
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.createTranslation?.slug).toBeUndefined();
    typeValue(inputById(h.element, 'ge-slug')!, 'varjumine-droonirun', h.fixture);
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.createTranslation?.slug).toBe('varjumine-droonirun');
  });

  it('the post-level fields are off the form (locale, pinned, the hero choice) and the heading names the mode', () => {
    const h = createHost(EDIT_POST, MEDIA_ASSETS, 'ru');
    expect(inputById(h.element, 'ge-locale')).toBeNull();
    expect(inputById(h.element, 'ge-pinned')).toBeNull();
    expect(inputById(h.element, 'ge-hero-none')).toBeNull();
    expect(h.element.querySelector('.guidance-editor__hero-choices')).toBeNull();
    // The shared hero is SHOWN (read-only — the remove action is
    // post-level and off this form).
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();
    expect(buttonByText(h.element, 'Remove image')).toBeNull();
    expect(h.element.querySelector('.guidance-editor__heading')!.textContent).toContain(
      'Add a translation',
    );
    expect(h.element.textContent).toContain('You are adding the ru translation of this post');
  });

  it('a foreign-locale row shows no home-locale note in translation mode', () => {
    const foreign: AdminGuidancePostDto = { ...EDIT_POST, locale: 'ru', homeLocale: 'en' };
    const h = createHost(foreign, MEDIA_ASSETS, 'et');
    expect(h.element.textContent).toContain('You are adding the et translation of this post');
    expect(h.element.textContent).not.toContain('home language');
  });

  it("a hero post with a CLEARED alt blocks Save (the pairing rule follows the post's shared hero)", () => {
    const h = createHost(EDIT_POST, MEDIA_ASSETS, 'ru');
    typeValue(inputById(h.element, 'ge-alt')!, '', h.fixture);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
  });

  it('a heroless post with a typed alt blocks Save (the forbidden direction)', () => {
    const h = createHost(NO_HERO_DRAFT, MEDIA_ASSETS, 'en');
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder', h.fixture);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');
  });

  it('a heroless post saves with heroImageAlt null (the pair is absent, not missing)', () => {
    const h = createHost(NO_HERO_DRAFT, MEDIA_ASSETS, 'en');
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.createTranslation).toEqual({
      locale: 'en',
      title: NO_HERO_DRAFT.title,
      body: NO_HERO_DRAFT.bodyHtml,
      heroImageAlt: null,
    });
  });
});

// ---- translation editing (bilingual-guidance) -------------------------------
//
// The editor's FOURTH mode: the page recreates it (the template branch)
// with the `translationEditMode` locale — the post was fetched SCOPED to
// that locale (the prefill shows that row, the slug prefilled), and Save
// emits the update-translation payload for the UPDATE endpoint (the row
// exists — never the create endpoint, never the post-level update).

/** The EN-scoped detail of EDIT_POST — the row translation-edit mode
 *  would prefill (the page's scoped fetch result). */
const EDIT_POST_EN: AdminGuidancePostDto = {
  ...EDIT_POST,
  locale: 'en',
  slug: 'sheltering-during-a-drone-strike',
  title: 'Sheltering during a drone strike',
  bodyHtml: '<p>Move to the shelter.</p>',
  heroImageAlt: 'Basement, view from the entrance',
};

describe('translation editing (bilingual-guidance)', () => {
  it('prefills from the scoped row (title, body, alt, the slug PREFILLED) and Save emits the update-translation payload — never the update, create, or create-translation payloads', () => {
    const h = createHost(EDIT_POST_EN, MEDIA_ASSETS, null, 'en');
    expect(inputById(h.element, 'ge-title')!.value).toBe(EDIT_POST_EN.title);
    expect(inputById(h.element, 'ge-slug')!.value).toBe(EDIT_POST_EN.slug);
    expect(inputById(h.element, 'ge-alt')!.value).toBe(EDIT_POST_EN.heroImageAlt);
    expect(rootOf(h).innerHTML).toContain('Move to the shelter');
    h.editor.onSave();
    h.fixture.detectChanges();
    const save = h.host.lastSave;
    expect(save?.id).toBe(EDIT_POST.id);
    expect(save?.update).toBeUndefined();
    expect(save?.create).toBeUndefined();
    expect(save?.createTranslation).toBeUndefined();
    expect(save?.updateTranslation).toEqual({
      locale: 'en',
      request: {
        slug: EDIT_POST_EN.slug,
        title: EDIT_POST_EN.title,
        body: EDIT_POST_EN.bodyHtml,
        heroImageAlt: EDIT_POST_EN.heroImageAlt,
      },
    });
  });

  it('a BLANKED slug is omitted from the payload (the row keeps its current slug); a typed slug is carried', () => {
    const h = createHost(EDIT_POST_EN, MEDIA_ASSETS, null, 'en');
    typeValue(inputById(h.element, 'ge-slug')!, '', h.fixture);
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.updateTranslation?.request.slug).toBeUndefined();
    typeValue(inputById(h.element, 'ge-slug')!, 'sheltering-revised', h.fixture);
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.updateTranslation?.request.slug).toBe('sheltering-revised');
  });

  it('the heading and the language line name the mode; the post-level fields are off the form and the home-locale note is replaced', () => {
    const h = createHost(EDIT_POST_EN, MEDIA_ASSETS, null, 'en');
    expect(h.element.querySelector('.guidance-editor__heading')!.textContent).toContain(
      'Edit a translation',
    );
    expect(h.element.textContent).toContain('You are editing the en translation of this post');
    expect(inputById(h.element, 'ge-locale')).toBeNull();
    expect(inputById(h.element, 'ge-pinned')).toBeNull();
    expect(inputById(h.element, 'ge-hero-none')).toBeNull();
    expect(h.element.querySelector('.guidance-editor__hero-choices')).toBeNull();
    // The shared hero is SHOWN (read-only — the remove action is
    // post-level and off this form).
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();
    expect(buttonByText(h.element, 'Remove image')).toBeNull();
    expect(h.element.textContent).not.toContain('home language');
  });

  it("a hero post with a CLEARED alt blocks Save (the pairing rule follows the post's shared hero)", () => {
    const h = createHost(EDIT_POST_EN, MEDIA_ASSETS, null, 'en');
    typeValue(inputById(h.element, 'ge-alt')!, '', h.fixture);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
  });

  it('a heroless post saves with heroImageAlt null (the pair is absent, not missing)', () => {
    const h = createHost(NO_HERO_DRAFT, MEDIA_ASSETS, null, 'en');
    h.editor.onSave();
    h.fixture.detectChanges();
    // The slug is prefilled (edit mode) and non-blank — it travels; a
    // blanked slug is omitted (the other test pins that direction).
    expect(h.host.lastSave?.updateTranslation).toEqual({
      locale: 'en',
      request: {
        slug: NO_HERO_DRAFT.slug,
        title: NO_HERO_DRAFT.title,
        body: NO_HERO_DRAFT.bodyHtml,
        heroImageAlt: null,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// 360px viewport (mobile-responsive-polish): the admin guidance
// surfaces (the editor form, the post list, the panel chrome) carry no
// page-level horizontal overflow. jsdom cannot measure a 360px viewport
// (no layout engine), so — like the pins in shelter-detail-page.spec.ts —
// the mechanisms that make overflow impossible are pinned against the
// stylesheets. 360px viewport − 2 × 20px .shell-body padding (page-shell.scss)
// − 2 × 16px .admin padding (admin-page.scss) = 288px of content on /admin.
// ---------------------------------------------------------------------------
describe('guidance admin at 360px (no page-level horizontal overflow)', () => {
  const readAdminScss = (name: string): string =>
    readFileSync(`${process.cwd()}/src/app/features/admin/${name}`, 'utf8');

  it('the editor form caps its width (max-width 720px) instead of fixing it — at 360px it hugs the 288px content column', () => {
    const scss = readAdminScss('guidance-editor.scss');
    const form = scss.match(/\.guidance-editor \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(form, 'the form rule must exist').not.toEqual('');
    expect(
      form,
      'the 720px must stay a MAX (a cap) — a fixed width would pin the form past the 360px viewport',
    ).toMatch(/max-width:\s*720px/);
    expect(form, 'no fixed width on the form').not.toMatch(/^\s*width:\s*\d/m);
  });

  it('the save/cancel action row wraps — the buttons stack instead of forcing a row wider than the form', () => {
    const scss = readAdminScss('guidance-editor.scss');
    const actions = scss.match(/\.guidance-editor__actions \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(actions, 'the actions rule must exist').not.toEqual('');
    expect(actions, 'the action row must wrap on narrow widths').toContain('flex-wrap: wrap');
  });

  it('the hero picker grid derives its columns from the container, floor ≤ 288px — it reflows to one column on a phone with no breakpoint', () => {
    const scss = readAdminScss('guidance-editor.scss');
    const picker = scss.match(/\.hero-picker \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(picker, 'the picker rule must exist').not.toEqual('');
    // A fixed column count (or a floor past the 288px content) would make
    // the picker wider than the viewport; auto-fill + a small floor reflows
    // instead.
    expect(
      picker,
      'the column count must derive from the container (auto-fill), with a px floor',
    ).toMatch(/repeat\(auto-fill,\s*minmax\(\d+px,\s*1fr\)\)/);
    const floor = Number(picker.match(/minmax\((\d+)px/)?.[1]);
    expect(
      floor,
      'the picker floor must be ≤ 288px (the /admin content width at 360px)',
    ).toBeLessThanOrEqual(288);
  });

  it('an unbounded media filename wraps inside its card (overflow-wrap: anywhere) instead of widening the card past the grid track — the picker name AND the selected-hero name line', () => {
    const scss = readAdminScss('guidance-editor.scss');
    const name = scss.match(/\.hero-picker__name \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(name, 'the picker name rule must exist').not.toEqual('');
    expect(name, 'filenames are unbounded server strings — the wrap is the mechanism').toContain(
      'overflow-wrap: anywhere',
    );
    const heroName = scss.match(/\.guidance-editor__hero-name \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(heroName, 'the selected-hero name line wraps the same way').toContain(
      'overflow-wrap: anywhere',
    );
  });

  it('the post table scrolls horizontally INSIDE its wrapped region — at 360px the 7-column table (180px title floor + 220px actions floor) is wider than the 288px content, so the scrollable element is the table region, never the document', () => {
    const shared = readAdminScss('_admin-shared.scss');
    const wrap = shared.match(/\.admin-table-wrap \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(wrap, 'the table wrap rule must exist').not.toEqual('');
    expect(wrap, 'the wrap must scroll horizontally (the table keeps its column floors)').toContain(
      'overflow-x: auto',
    );
    // The move buttons inside the actions cell wrap too — they are the
    // PRIMARY reorder mechanism (guidance-manual-order) and must stay
    // reachable on a phone.
    const list = readAdminScss('guidance-order-list.scss');
    const move = list.match(/\.admin-guidance-move \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(move, 'the move-button row must wrap').toContain('flex-wrap: wrap');
  });

  it('the panel chrome is capped at the container: the search form is min(420px, 100%), the content-language block max-width 420px (a cap, not a floor) — neither is a bare 420px, which is wider than the 360px viewport', () => {
    const shared = readAdminScss('_admin-shared.scss');
    const search = shared.match(/\.admin-search \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(search, 'the search rule must exist').not.toEqual('');
    expect(
      search,
      'the 420px must be a MIN() cap — a bare `width: 420px` is 60px wider than the 360px viewport',
    ).toMatch(/width:\s*min\(420px,\s*100%\)/);
    const panel = readAdminScss('guidance-panel.scss');
    const lang = panel.match(/\.admin-guidance-language \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(lang, 'the content-language rule must exist').not.toEqual('');
    expect(
      lang,
      'the 420px must be a MAX (the block hugs the 288px content column below it)',
    ).toMatch(/max-width:\s*420px/);
    expect(lang, 'no fixed width on the language block').not.toMatch(/^\s*width:\s*\d/m);
  });
});
