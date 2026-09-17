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
  bodyHtmlBlankValidator,
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
  status: 'PUBLISHED',
  pinned: true,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

/** The edit-mode DRAFT counterpart of EDIT_POST (the draft-state tests). */
const DRAFT_POST: AdminGuidancePostDto = { ...EDIT_POST, id: 12, status: 'DRAFT' };

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
    (save)="onSave($event)"
    (cancel)="cancelled = true"
  />`,
})
class Host {
  post: AdminGuidancePostDto | null = EDIT_POST;
  assets: MediaAssetDto[] | null = MEDIA_ASSETS;
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
): EditorHarness {
  const admin = new FakeAdminGateway();
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [{ provide: AdminGateway, useValue: admin }],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.post = post;
  fixture.componentInstance.assets = assets;
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

/** Fire a paste at the editor root the way a real clipboard would:
 *  `plain` is what getData('text/plain') returns; `rich` is the markup a
 *  real clipboard would also carry (never read — the paste contract is
 *  plain text only). Dispatching at the root lets the component's
 *  capture-phase handler on the host see the event first. */
function pastePlainText(root: HTMLElement, plain: string, rich = ''): void {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text/plain' ? plain : rich) },
    configurable: true,
  });
  root.dispatchEvent(event);
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
    h.editor.selectHero(MEDIA_ASSETS[0]!);
    h.fixture.detectChanges();
    h.editor.removeHero();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
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
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('Loading the media library…');
  });

  it('the picker shows the empty line for an empty library', () => {
    const h = createHost(null, []);
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('No images in the media library yet');
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
    const h = createHost({ ...EDIT_POST, bodyHtml: '<p>a</p><blockquote>quoted</blockquote><p>b</p>' });
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
    expect(buttonByText(h.element, 'Quote')).toBeNull();
    const labels = [...h.element.querySelectorAll<HTMLElement>('.body-editor__group button')].map(
      (b) => (b.textContent ?? '').trim(),
    );
    expect(labels).toEqual([
      'Paragraph',
      'Heading 2',
      'Heading 3',
      'Bulleted list',
      'Numbered list',
      'Bold',
      'Italic',
      'Link',
    ]);
  });

  it('choosing a block type applies the expected tag (Heading 2 → <h2>, Heading 3 → <h3>, Paragraph back)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const quill = quillOf(h);
    const root = rootOf(h);
    const length = quill.getText(0, quill.getLength() - 1).length;

    quill.setSelection(0, length);
    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();
    expect(root.innerHTML).toBe('<h2>Pöördu peavarjendisse.</h2>');
    expect(h.editor.form.get('body')?.value).toBe('<h2>Pöördu peavarjendisse.</h2>');

    quill.setSelection(0, length);
    buttonByText(h.element, 'Heading 3')!.click();
    h.fixture.detectChanges();
    expect(root.innerHTML).toBe('<h3>Pöördu peavarjendisse.</h3>');

    quill.setSelection(0, length);
    buttonByText(h.element, 'Paragraph')!.click();
    h.fixture.detectChanges();
    expect(root.innerHTML).toBe('<p>Pöördu peavarjendisse.</p>');
  });

  it('the block group pressed state reflects where the selection sits (Quill owns the state)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<h2>Pöördu peavarjendisse.</h2>');
    const quill = quillOf(h);
    quill.setSelection(0, 3);
    h.fixture.detectChanges();

    expect(buttonByText(h.element, 'Heading 2')!.getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(h.element, 'Paragraph')!.getAttribute('aria-pressed')).toBe('false');
    expect(buttonByText(h.element, 'Heading 3')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('typing then formatting yields allowlist tags (the round-trip contract)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pealkiri siin</p>');
    const quill = quillOf(h);

    // Type (a user edit — Quill records it for undo).
    quill.insertText(quill.getLength() - 1, ' Ja veel.', 'user');
    // Bold the first word, then make the whole line a heading.
    quill.setSelection(0, 5);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    quill.setSelection(0, quill.getLength() - 1);
    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();

    const body = submittedBody(h);
    expect(body).toBe('<h2><strong>Pealk</strong>iri siin Ja veel.</h2>');
    assertCleanBody(body);
  });

  it('Bold wraps the selection in <strong>; a second immediate Bold toggles it OFF (never <b>)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const bold = buttonByText(h.element, 'Bold')!;

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
    const bold = buttonByText(h.element, 'Bold')!;

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
    const bold = buttonByText(h.element, 'Bold')!;
    const italic = buttonByText(h.element, 'Italic')!;

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
    buttonByText(h.element, 'Numbered list')!.click();
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
    buttonByText(h.element, 'Paragraph')!.click();
    h.fixture.detectChanges();

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

  // ---- the link control (prompt + the allowlisted protocols) ----------------

  it('an allowed link is created with its href; the wire value is clean (no editing-time target/rel)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    quill.setSelection(6, 5); // "brave"

    withPrompt('https://example.com', () => {
      buttonByText(h.element, 'Link')!.click();
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
      buttonByText(h.element, 'Link')!.click();
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
      buttonByText(h.element, 'Link')!.click();
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
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    });

    expect(h.element.textContent).toContain('Select the text to link first.');
    expect(rootOf(h).querySelector('a')).toBeNull();
  });

  // ---- paste (plain text only; the conversion guard drops disallowed
  // ---- formats from anything that does reach the document) -----------------

  it('paste inserts plain text, never the source markup', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const root = rootOf(h);
    quill.setSelection(6, 5); // "brave"

    pastePlainText(root, 'Kaitseorganite juhised', '<b>markup</b>');
    h.fixture.detectChanges();

    // The rich-clipboard payload is never consulted or kept: the
    // selection is replaced by PLAIN text, nothing else of the source
    // markup survives.
    expect(root.innerHTML).toBe('<p>hello Kaitseorganite juhised world</p>');
    expect(h.editor.form.get('body')?.value).toBe('<p>hello Kaitseorganite juhised world</p>');
  });

  it('paste over a selection replaces it; newlines become line breaks (plain text only)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const quill = quillOf(h);
    const root = rootOf(h);
    quill.setSelection(6, 5); // "brave"

    pastePlainText(root, 'line1\nline2', '<div>rich</div>');
    h.fixture.detectChanges();

    expect(root.innerHTML).toBe('<p>hello line1</p><p>line2 world</p>');
    assertCleanBody(submittedBody(h));
  });

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

  /** The toolbar's ql-header value attributes (the offered heading
   *  levels + the paragraph's empty value) — read from the rendered
   *  toolbar, so a template edit that offers h1/h4-h6 fails the guard. */
  function h_headerValues(): string[] {
    const h = createHost(null);
    return [...h.element.querySelectorAll<HTMLButtonElement>('.ql-header')].map(
      (b) => b.getAttribute('value') ?? '',
    );
  }

  it('the toolbar tools take a pointer cursor when enabled, not when disabled (the .btn treatment, pinned in the stylesheet)', () => {
    // jsdom cannot observe a hovered cursor — the repo pins CSS invariants
    // by reading the stylesheet (the design-tokens.spec.ts convention;
    // this assertion lives here so that file stays untouched).
    const scss = readFileSync(
      `${process.cwd()}/src/app/features/admin/guidance-editor.scss`,
      'utf8',
    );
    const block = scss.match(/\.body-editor__tool \{[\s\S]*?\n\}/);
    expect(block, 'guidance-editor.scss must style .body-editor__tool').not.toBeNull();
    expect(block![0], 'an enabled toolbar control must show a pointer').toContain(
      'cursor: pointer',
    );
    const disabled = block![0].match(/&:disabled \{[^}]*\}/);
    expect(disabled, 'a disabled state must be declared on the tool').not.toBeNull();
    expect(disabled![0], 'a disabled toolbar control must not show a pointer').toContain(
      'cursor: default',
    );
  });

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
