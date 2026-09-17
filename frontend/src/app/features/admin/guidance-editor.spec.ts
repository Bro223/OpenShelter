import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import type {
  AdminGuidancePostDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  UpdateGuidancePostRequest,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { ApiError } from '../../core/api-error';
import {
  GuidanceEditor,
  type GuidanceEditorSave,
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
 *  convention: dispatch 'input', then change detection). */
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

/** The body editor's region (the contenteditable the toolbar drives). */
function regionOf(h: EditorHarness): HTMLElement {
  return h.element.querySelector<HTMLElement>('#ge-body')!;
}

/** Select the whole text node containing `text` in the region (the jsdom
 *  selection seam — the specs have no real caret). */
function selectRegionText(region: HTMLElement, text: string): void {
  const range = document.createRange();
  const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    if ((node.textContent ?? '').includes(text)) {
      range.selectNodeContents(node);
      break;
    }
  }
  const sel = window.getSelection();
  if (sel === null) {
    throw new Error('jsdom: no selection');
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** A COLLAPSED caret (no selection) at `offset` in the text node with
 *  full text `nodeText`. */
function selectCollapsed(region: HTMLElement, nodeText: string, offset: number): void {
  const range = document.createRange();
  const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    if ((node.textContent ?? '') === nodeText) {
      range.setStart(node, offset);
      range.setEnd(node, offset);
      break;
    }
  }
  const sel = window.getSelection();
  if (sel === null) {
    throw new Error('jsdom: no selection');
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** The region's current selection text (empty string if collapsed/none). */
function selectedText(): string {
  const sel = window.getSelection();
  return sel !== null && sel.rangeCount > 0 ? sel.toString() : '';
}

/** Fire the component's paste handler with a controlled clipboard payload:
 *  `plain` is what getData('text/plain') returns; `rich` (ignored by design)
 *  is the markup a real clipboard would also carry. */
function paste(region: HTMLElement, plain: string, rich = ''): void {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (t: string) => (t === 'text/plain' ? plain : rich) },
    configurable: true,
  });
  region.dispatchEvent(event);
}

/** A real multi-block selection: from the start of the block holding
 *  `firstText` to after the block holding `lastText`. */
function selectAcrossBlocks(region: HTMLElement, firstText: string, lastText: string): void {
  const blocks = [...region.querySelectorAll('p, li, h2, h3, blockquote')];
  const first = blocks.find((el) => (el.textContent ?? '').includes(firstText))!;
  const last = blocks.find((el) => (el.textContent ?? '').includes(lastText))!;
  const range = region.ownerDocument.createRange();
  range.selectNodeContents(first);
  range.setEndAfter(last);
  const sel = getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
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
/** A PARTIAL selection: a real hand-built Range over a substring of one
 *  text node (`nodeText` must equal the node's full text; `from`/`to` are
 *  character offsets into it). This is the owner's case — drag across part
 *  of a sentence — which `selectRegionText` (whole node) never exercises.
 *  For a cross-paragraph span, pass two nodes via `selectOffsetSpan`. */
function selectOffsetRange(
  region: HTMLElement,
  nodeText: string,
  from: number,
  to: number,
): void {
  const range = document.createRange();
  const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    if ((node.textContent ?? '') === nodeText) {
      range.setStart(node, from);
      range.setEnd(node, to);
      break;
    }
  }
  const sel = window.getSelection();
  if (sel === null) {
    throw new Error('jsdom: no selection');
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** A partial selection that STARTS in one text node and ENDS in another
 *  (cross-paragraph). Node identity is by full text content. */
function selectOffsetSpan(
  region: HTMLElement,
  startText: string,
  startOffset: number,
  endText: string,
  endOffset: number,
): void {
  const find = (content: string): Node => {
    const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode()) !== null) {
      if ((node.textContent ?? '') === content) {
        return node;
      }
    }
    throw new Error(`no text node with content "${content}"`);
  };
  const range = document.createRange();
  range.setStart(find(startText), startOffset);
  range.setEnd(find(endText), endOffset);
  const sel = window.getSelection();
  if (sel === null) {
    throw new Error('jsdom: no selection');
  }
  sel.removeAllRanges();
  sel.addRange(range);
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

  // ---- the visual body editor (the toolbar over the contenteditable) -------

  it('loading a stored body puts its HTML in the editor, and Save submits it unchanged', () => {
    const h = createHost({ ...EDIT_POST, bodyHtml: '<h2>X</h2><p>Y</p>' });
    const region = regionOf(h);
    // The stored (sanitized) markup goes in as markup, not escaped text.
    expect(region.innerHTML).toBe('<h2>X</h2><p>Y</p>');

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update?.body).toBe('<h2>X</h2><p>Y</p>');
  });

  it('choosing a block type applies the expected tag (Heading 2 → <h2>)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);
    selectRegionText(region, 'Pöördu');

    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<h2>Pöördu peavarjendisse.</h2>');
    expect(h.editor.form.get('body')?.value).toBe('<h2>Pöördu peavarjendisse.</h2>');
  });

  it('the block group pressed state reflects where the selection sits', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<h2>Pöördu peavarjendisse.</h2>');
    const region = regionOf(h);
    selectRegionText(region, 'Pöördu');
    (h.editor as unknown as { refreshToolbarState(): void }).refreshToolbarState();
    h.fixture.detectChanges();

    expect(buttonByText(h.element, 'Heading 2')!.getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(h.element, 'Paragraph')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('the list choices map to ul/ol with li items', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);

    selectRegionText(region, 'Pöördu');
    buttonByText(h.element, 'Bulleted list')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<ul><li>Pöördu peavarjendisse.</li></ul>');

    selectRegionText(region, 'Pöördu');
    buttonByText(h.element, 'Numbered list')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<ol><li>Pöördu peavarjendisse.</li></ol>');
    expect(h.editor.form.get('body')?.value).toBe('<ol><li>Pöördu peavarjendisse.</li></ol>');
  });

  it('Quote is not offered by the toolbar (the owner removed the choice)', () => {
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

  it('a stored blockquote still round-trips (the normalizer keeps it even without a toolbar choice)', () => {
    const h = createHost({ ...EDIT_POST, bodyHtml: '<p>a</p><blockquote>quoted</blockquote><p>b</p>' });
    const region = regionOf(h);
    // The stored blockquote loads as markup (the normalizer does not unwrap it).
    expect(region.innerHTML).toBe('<p>a</p><blockquote>quoted</blockquote><p>b</p>');

    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.host.lastSave?.update?.body).toBe('<p>a</p><blockquote>quoted</blockquote><p>b</p>');
  });

  it('Bold applies <strong> and Italic <em> — never <b>/<i> (the sanitizer spellings)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);

    selectRegionText(region, 'Pöördu');
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p><strong>Pöördu peavarjendisse.</strong></p>');

    selectRegionText(region, 'Pöördu');
    buttonByText(h.element, 'Italic')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p><strong><em>Pöördu peavarjendisse.</em></strong></p>');
    expect(region.innerHTML).not.toMatch(/<b>|<\/b>|<i>|<\/i>/);
    expect(h.editor.form.get('body')?.value).toBe(
      '<p><strong><em>Pöördu peavarjendisse.</em></strong></p>',
    );
  });

  it('Ctrl/Cmd+B and Ctrl/Cmd+I apply strong/em (the keyboard spelling of the toolbar)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);

    selectRegionText(region, 'Pöördu');
    region.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p><strong>Pöördu peavarjendisse.</strong></p>');

    selectRegionText(region, 'Pöördu');
    region.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'i', metaKey: true, bubbles: true, cancelable: true }),
    );
    h.fixture.detectChanges();
    expect(region.innerHTML).toContain('<em>');
    expect(region.innerHTML).not.toContain('<i>');
  });

  it('an empty editor counts as empty: Save is blocked with the bodyRequired copy', () => {
    const h = createHost(null);
    typeValue(inputById(h.element, 'ge-title')!, 'Uus post', h.fixture);
    // The region holds nothing — exactly as an empty textarea did.

    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
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

  it('a javascript: link is refused with a readable message and inserts nothing', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);
    selectRegionText(region, 'Pöördu');
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('javascript:alert(1)') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }

    expect(h.element.textContent).toContain('Only http, https and mailto links are kept');
    expect(region.querySelector('a')).toBeNull();
    expect(region.innerHTML).toBe('<p>Pöördu peavarjendisse.</p>');
  });

  it('an allowed link is inserted with its href (the sanitizer keeps a[href])', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);
    selectRegionText(region, 'Pöördu');
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('https://www.päästeamet.ee') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }

    expect(region.innerHTML).toBe(
      '<p><a href="https://www.päästeamet.ee">Pöördu peavarjendisse.</a></p>',
    );
    expect(h.editor.form.get('body')?.value).toBe(
      '<p><a href="https://www.päästeamet.ee">Pöördu peavarjendisse.</a></p>',
    );
  });

  it('paste inserts plain text, never the source markup', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>Pöördu peavarjendisse.</p>');
    const region = regionOf(h);
    selectRegionText(region, 'Pöördu');

    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) =>
          type === 'text/plain' ? 'Kaitseorganite juhised' : '<b>markup</b>',
      },
      configurable: true,
    });
    region.dispatchEvent(event);
    h.fixture.detectChanges();

    // The rich-clipboard payload is never consulted or kept.
    expect(region.innerHTML).toBe('<p>Kaitseorganite juhised</p>');
    expect(h.editor.form.get('body')?.value).toBe('<p>Kaitseorganite juhised</p>');
  });

  // ---- PARTIAL selections (the owner's case — a hand-built range over part
  // ---- of a sentence, NOT a whole node). These are the paths the whole-node
  // ---- helper never reaches: text-node splitting via extractContents,
  // ---- clipToBlock boundary logic, and per-block clipping across two <p>.

  it('(a) partial selection + Bold wraps ONLY the selected word in <strong>', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    // "brave" = offsets 6..11 of "hello brave world".
    selectOffsetRange(region, 'hello brave world', 6, 11);

    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');
  });

  it('(b) partial selection + Italic wraps ONLY the selected word in <em>', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);

    buttonByText(h.element, 'Italic')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<p>hello <em>brave</em> world</p>');
  });

  it('(c) partial selection + Heading 2 converts the WHOLE containing block', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);

    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();

    // The whole sentence becomes the heading, not just the selected word.
    expect(region.innerHTML).toBe('<h2>hello brave world</h2>');
  });

  it('(d) partial selection + Link wraps only the selected word in <a href>', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('https://example.ee') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }

    expect(region.innerHTML).toBe('<p>hello <a href="https://example.ee">brave</a> world</p>');
  });

  it('(e) two commands in a row: Bold word A, then Italic word B — both apply', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);

    // Command 1: Bold "brave" (offsets 6..11).
    selectOffsetRange(region, 'hello brave world', 6, 11);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');

    // Command 2: Italic "world" — now in the " world" node (offsets 1..6).
    selectOffsetRange(region, ' world', 1, 6);
    buttonByText(h.element, 'Italic')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<p>hello <strong>brave</strong> <em>world</em></p>');
  });

  it('(f) a selection spanning two paragraphs bolds in EACH, never one <strong> across blocks', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>first para</p><p>second para</p>');
    const region = regionOf(h);
    // From the start of "first para" to "second" (offset 6) in the second.
    selectOffsetSpan(region, 'first para', 0, 'second para', 6);

    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe(
      '<p><strong>first para</strong></p><p><strong>second</strong> para</p>',
    );
  });

  it('(g) a partial-selection Bold survives the save path (the normalizer keeps it)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);

    selectOffsetRange(region, 'hello brave world', 6, 11);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.create?.body).toBe('<p>hello <strong>brave</strong> world</p>');
  });

  // ---- Part 2: the "glitchy" editor — selection/caret/focus sanity after a
  // ---- command. These are the behaviours the owner's partial-selection
  // ---- case exercises and the whole-node tests never did.

  it('P2.2 after Bold the selection is restored INSIDE the formatted text; a second immediate Bold toggles off', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"

    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');

    // The selection must now sit on the just-formatted word (a sane place),
    // NOT be collapsed/lost. A second IMMEDIATE Bold (no re-select) toggles off.
    expect(selectedText()).toContain('brave');
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello brave world</p>');
  });

  it('P2.1 a command keeps focus in the region (the toolbar does not steal it)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    region.focus();
    selectOffsetRange(region, 'hello brave world', 6, 11);

    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    expect(document.activeElement).toBe(region);
    expect(selectedText()).toContain('brave');
  });

  it('P2.3 three commands in a row on three different words all apply (no stale range, no silent no-op)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>one two three four</p>');
    const region = regionOf(h);

    // "one" 0..3 -> Bold
    selectOffsetRange(region, 'one two three four', 0, 3);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    // "two" 4..7 -> Italic (now in " two three four")
    selectOffsetRange(region, ' two three four', 1, 4);
    buttonByText(h.element, 'Italic')!.click();
    h.fixture.detectChanges();
    // "three" -> Bold (now in " three four")
    selectOffsetRange(region, ' three four', 1, 6);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe(
      '<p><strong>one</strong> <em>two</em> <strong>three</strong> four</p>',
    );
  });

  it('P2.4 typing straight after a command inserts at the caret (the DOM was not rewritten under it)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    const pBefore = region.querySelector('p')!;

    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    // A wholesale rewrite (innerHTML re-set) would replace the <p> and every
    // node under it, dropping the caret to the start — the "glitchy" feel.
    expect(region.querySelector('p')).toBe(pBefore);
    expect(region.querySelector('p')!.querySelector('strong')).not.toBeNull();
    // The caret/selection is restored to the formatted word, so the next
    // keystroke lands where the user just looked.
    expect(selectedText()).toContain('brave');
  });

  it('P2.5 toolbar pressed state matches the selection: inside a list, inside a link, and bold+italic at once', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<ul><li>hello brave world</li></ul>');
    const region = regionOf(h);

    // Inside a list item -> the list button is pressed.
    selectOffsetRange(region, 'hello brave world', 6, 11);
    (h.editor as unknown as { refreshToolbarState(): void }).refreshToolbarState();
    h.fixture.detectChanges();
    expect(buttonByText(h.element, 'Bulleted list')!.getAttribute('aria-pressed')).toBe('true');

    // Bold + Italic at once -> both pressed.
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    buttonByText(h.element, 'Italic')!.click();
    h.fixture.detectChanges();
    expect(buttonByText(h.element, 'Bold')!.getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(h.element, 'Italic')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('P2.6a a block type with a COLLAPSED caret applies to the containing block', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    // A caret in the middle of the text (collapsed).
    selectCollapsed(region, 'hello brave world', 8);

    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<h2>hello brave world</h2>');
  });

  it('P2.6b a block type with a partial selection converts the WHOLE containing block', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);

    buttonByText(h.element, 'Heading 3')!.click();
    h.fixture.detectChanges();

    expect(region.innerHTML).toBe('<h3>hello brave world</h3>');
  });

  it('P2.7 a command does not rewrite the region: the untouched text node stays the same node', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    const pBefore = region.querySelector('p')!;

    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();

    // extractContents legitimately splits the text node, but the block and
    // region must be stable nodes (a wholesale innerHTML rewrite would
    // replace the <p> and every node under it).
    expect(region.querySelector('p')).toBe(pBefore);
    expect(region.innerHTML).toBe('<p>hello <strong>brave</strong> world</p>');
  });

  // ---- Part 3: the combination matrix ("all sorts of text combinations").
  // ---- Cross-cutting rule: after each, the SUBMITTED value holds only
  // ---- allowlist tags, no class/style/id/event attributes, a[href]
  // ---- restricted to http/https/mailto.

  it('C1a bold at the very START of a text node', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 0, 5);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p><strong>hello</strong> brave world</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C1b bold at the very END of a text node', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 12, 17);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello brave <strong>world</strong></p>');
    assertCleanBody(submittedBody(h));
  });

  it('C1c bold spanning two words', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 17); // "brave world"
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello <strong>brave world</strong></p>');
    assertCleanBody(submittedBody(h));
  });

  it('C2 a selection from one text node to another (across an inline element)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>aaa <em>bb</em> ccc</p>');
    const region = regionOf(h);
    selectOffsetSpan(region, 'aaa ', 2, ' ccc', 2);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    // The whole span becomes bold; the <em> inside is preserved (not nested).
    expect(region.innerHTML).toBe('<p>aa<strong>a <em>bb</em> c</strong>cc</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C3a bold spanning an existing <strong> does not nest a duplicate', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello <strong>brave</strong> world</p>');
    const region = regionOf(h);
    // Span ACROSS the existing <strong>: "lo " + "brave" + " wor".
    selectOffsetSpan(region, 'hello ', 3, ' world', 3);
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hel<strong>lo brave wo</strong>rld</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C4a bold inside a link keeps the link and wraps only the word', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>see <a href="https://x.ee">here now</a> ok</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'here now', 0, 4); // "here"
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe(
      '<p>see <a href="https://x.ee"><strong>here</strong> now</a> ok</p>',
    );
    assertCleanBody(submittedBody(h));
  });

  it('C4b italic inside bold: both apply (nested em inside strong)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"
    buttonByText(h.element, 'Bold')!.click();
    h.fixture.detectChanges();
    buttonByText(h.element, 'Italic')!.click(); // selection restored over the strong
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello <strong><em>brave</em></strong> world</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C4c toggle bold off, then italic off, on a bold+italic span', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello <strong><em>brave</em></strong> world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'brave', 0, 5);
    buttonByText(h.element, 'Bold')!.click(); // removes the strong
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello <em>brave</em> world</p>');
    buttonByText(h.element, 'Italic')!.click(); // removes the em
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello brave world</p>');
  });

  // ---- Part 3 (cont): block, list, paste, link, empty-region combos ----

  it('C5.1 Heading 2 over a selection spanning two paragraphs', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>para one</p><p>para two</p>');
    const region = regionOf(h);
    selectAcrossBlocks(region, 'para one', 'para two');
    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<h2>para one</h2><h2>para two</h2>');
    assertCleanBody(submittedBody(h));
  });

  it('C5.2 Heading 2 over a list item and a following paragraph', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<ul><li>an item</li></ul><p>then a paragraph</p>');
    const region = regionOf(h);
    selectAcrossBlocks(region, 'an item', 'then a paragraph');
    buttonByText(h.element, 'Heading 2')!.click();
    h.fixture.detectChanges();
    expect([...region.querySelectorAll('h2')].map((el) => el.textContent)).toEqual([
      'an item',
      'then a paragraph',
    ]);
    expect(region.querySelector('ul, ol, li')).toBeNull();
    assertCleanBody(submittedBody(h));
  });

  it('C6.1 switching a bulleted list to numbered over its full selection', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<ul><li>one</li><li>two</li></ul>');
    const region = regionOf(h);
    selectAcrossBlocks(region, 'one', 'two');
    buttonByText(h.element, 'Numbered list')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<ol><li>one</li><li>two</li></ol>');
    assertCleanBody(submittedBody(h));
  });

  it('C6.2 list -> paragraph: Paragraph on a list item', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<ul><li>an item</li></ul>');
    const region = regionOf(h);
    selectRegionText(region, 'an item');
    buttonByText(h.element, 'Paragraph')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>an item</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C6.3 adding a list to a caret in the middle of a paragraph', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>before and after</p>');
    const region = regionOf(h);
    selectCollapsed(region, 'before and after', 6);
    buttonByText(h.element, 'Bulleted list')!.click();
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<ul><li>before and after</li></ul>');
    assertCleanBody(submittedBody(h));
  });

  it('C7.1 paste into a collapsed caret inserts at the caret', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectCollapsed(region, 'hello brave world', 5);
    paste(region, 'X');
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>helloX brave world</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C7.2 paste over a selection replaces the selection', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"
    paste(region, 'X');
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello X world</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C7.3 paste containing newlines becomes <br> separators', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello world', 6, 11); // "world"
    paste(region, 'line1\nline2');
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello line1<br>line2</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C7.4 paste carrying markup lands as plain text only', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11); // "brave"
    paste(region, 'safe text', '<b>safe</b> text');
    h.fixture.detectChanges();
    expect(region.innerHTML).toBe('<p>hello safe text world</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C8.1 a valid https link is inserted with its href', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('https://example.com') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }
    expect(region.innerHTML).toBe(
      '<p>hello <a href="https://example.com">brave</a> world</p>',
    );
    assertCleanBody(submittedBody(h));
  });

  it('C8.2 a valid mailto link is kept', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);
    const originalPrompt = window.prompt;
    window.prompt = vi
      .fn()
      .mockReturnValue('mailto:kontakt@example.ee') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }
    expect(region.innerHTML).toBe(
      '<p>hello <a href="mailto:kontakt@example.ee">brave</a> world</p>',
    );
    assertCleanBody(submittedBody(h));
  });

  it('C8.3 a javascript: link is refused and inserts nothing', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>hello brave world</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'hello brave world', 6, 11);
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('javascript:alert(1)') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }
    expect(region.querySelector('a')).toBeNull();
    expect(region.innerHTML).toBe('<p>hello brave world</p>');
  });

  it('C8.4 a link over a cross-block selection wraps ONE anchor per block', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>first para</p><p>second para</p>');
    const region = regionOf(h);
    selectAcrossBlocks(region, 'first para', 'second para');
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('https://example.com') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }
    expect(region.innerHTML).toBe(
      '<p><a href="https://example.com">first para</a></p>' +
        '<p><a href="https://example.com">second para</a></p>',
    );
    assertCleanBody(submittedBody(h));
  });

  it('C8.5 re-linking over an existing link rewrites the href (no nesting)', () => {
    const h = createHost(null);
    fillRequired(h, 'Uus post', '<p>see <a href="https://old.ee">link text</a> ok</p>');
    const region = regionOf(h);
    selectOffsetRange(region, 'link text', 0, 9);
    const originalPrompt = window.prompt;
    window.prompt = vi.fn().mockReturnValue('https://new.ee') as typeof window.prompt;
    try {
      buttonByText(h.element, 'Link')!.click();
      h.fixture.detectChanges();
    } finally {
      window.prompt = originalPrompt;
    }
    expect(region.innerHTML).toBe('<p>see <a href="https://new.ee">link text</a> ok</p>');
    assertCleanBody(submittedBody(h));
  });

  it('C9.1 empty-region shapes still block save after a block action', () => {
    const h = createHost(null);
    typeValue(inputById(h.element, 'ge-title')!, 'Uus post', h.fixture);
    const region = regionOf(h);
    expect(region.innerHTML).toBe('');
    buttonByText(h.element, 'Paragraph')!.click();
    h.fixture.detectChanges();
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);
    expect(submittedBody(h)).toBe('');
    expect(h.element.textContent).toContain('A body is required.');
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
