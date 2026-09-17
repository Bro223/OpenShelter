import {
  ChangeDetectionStrategy,
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
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import { ApiError, toApiError } from '../../core/api-error';
import { AdminGateway } from '../../gateways/admin-gateway';
import type {
  AdminGuidancePostDto,
  GuidanceStatus,
  MediaAssetDto,
  UpdateGuidancePostRequest,
  CreateGuidancePostRequest,
} from '../../core/models';
import { nameBlankValidator } from '../../shared/form-helpers';
import { BannerComponent } from '../../shared/banner.component';

/**
 * The generated-slug shape (the backend's SlugFactory validator
 * `^[a-z0-9]+(-[a-z0-9]+)*$`). The UI enforces the same shape up front so
 * an admin-supplied slug never spends a round trip on a 400; a BLANK slug
 * is always allowed (create: the server derives it from the title; edit:
 * the post keeps its current one).
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What Save emits — the page routes `id === null` to the create endpoint
 *  (the POST body) and a given id to the update endpoint (the PUT body). */
export interface GuidanceEditorSave {
  /** null = create (no id yet); the post id for an edit. */
  id: number | null;
  /** Create mode: the POST /admin/guidance payload. */
  create?: CreateGuidancePostRequest;
  /** Edit mode: the PUT /admin/guidance/{id} payload. `status` is NOT part
   *  of it — the publication state moves only through publish/unpublish. */
  update?: UpdateGuidancePostRequest;
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

/** The block kinds the toolbar offers — exactly the BodySanitizer
 *  allowlist's block set (`h2 h3 p br strong em ul ol li a blockquote`)
 *  minus `br` (a byproduct of typing, not a choice the admin makes). The
 *  toolbar IS the feature set: whatever is not offered here does not
 *  survive the server sanitizer. */
export type BodyBlock = 'p' | 'h2' | 'h3' | 'ul' | 'ol';

/** The DOM tag each offered block kind maps to. `blockquote` is NOT here —
 *  the owner removed the Quote choice from the toolbar, so the toolbar can
 *  no longer CREATE a blockquote (an existing one still round-trips: the
 *  normalizer keeps it, it just is not a choice this list offers). */
const BLOCK_TAG: Record<BodyBlock, string> = {
  p: 'p',
  h2: 'h2',
  h3: 'h3',
  ul: 'ul',
  ol: 'ol',
};

/** The link protocols the sanitizer keeps, required as an explicit
 *  prefix: relative URLs and `javascript:`/`data:` are refused up front,
 *  so a link that is ever stored is one the server will keep. */
export const ALLOWED_LINK_PROTOCOL = /^(https?|mailto):/i;

/** The empty-region seed (the block commands' shape): wrap any stray
 *  leading bare text (typing into an empty region puts text nodes
 *  directly under the region) in a fresh block of `blockTag`, add a
 *  `<br>` when nothing is there, append to the region, return the block.
 *  A region holding only this shape is EMPTY (the blank rule). */
function seedEmptyBlock(editor: HTMLElement, blockTag: string): HTMLElement {
  const seed = document.createElement(blockTag);
  while (editor.firstChild !== null && editor.firstChild.nodeType !== Node.ELEMENT_NODE) {
    seed.appendChild(editor.firstChild);
  }
  if (seed.childNodes.length === 0) {
    seed.appendChild(document.createElement('br'));
  }
  editor.appendChild(seed);
  return seed;
}

/* ---- the body editor's command adapter ---------------------------------- */

/**
 * The body editor's command surface — the ONE place the contenteditable
 * region is mutated by the toolbar, isolated so a later swap to a real
 * editor library touches only this object.
 *
 * Deliberately NO document.execCommand: it is deprecated, and its tag
 * choices (`b`/`i`/`div`) are not the sanitizer's allowlist. Plain DOM
 * Range work instead — every command emits exactly the allowlist's
 * elements (`strong`, `em`, `p`, `h2`, `h3`, `blockquote`, `ul`, `ol`,
 * `li`, `a[href]`), so the round trip to the server is lossless by
 * construction.
 */
export const bodyCommands = {
  /** Set the block kind of the selected block(s): p/h2/h3 rename
   *  the blocks (lists become paragraphs first); an empty region gets a
   *  single empty block of the kind. */
  formatBlock(editor: HTMLElement, block: Exclude<BodyBlock, 'ul' | 'ol'>): void {
    const target = BLOCK_TAG[block];
    const targets = selectionBlocks(editor);
    if (targets.length === 0) {
      const seed = seedEmptyBlock(editor, target);
      restoreSelection(editor, [seed]);
      return;
    }
    const blocks: HTMLElement[] = [];
    for (const t of targets) {
      if (t.tagName === 'UL' || t.tagName === 'OL') {
        blocks.push(...listToParagraphs(t));
      } else {
        blocks.push(t);
      }
    }
    const finalBlocks: HTMLElement[] = [];
    for (const b of blocks) {
      finalBlocks.push(b.tagName.toLowerCase() === target ? b : renameBlock(b, target));
    }
    restoreSelection(editor, finalBlocks);
  },

  /** Turn the selected blocks into the list kind (an already-listed
   *  block of the other kind switches kind; a paragraph adjacent to a
   *  same-kind list joins it). */
  toggleList(editor: HTMLElement, type: 'ul' | 'ol'): void {
    const targets = selectionBlocks(editor);
    if (targets.length === 0) {
      return;
    }
    // target -> live element (renamed lists detach the old node).
    const live = new Map<HTMLElement, HTMLElement>();
    for (const t of targets) {
      if ((t.tagName === 'UL' || t.tagName === 'OL') && t.tagName.toLowerCase() !== type) {
        live.set(t, renameBlock(t, type));
      } else {
        live.set(t, t);
      }
    }
    let currentList: HTMLElement | null = null;
    const items: HTMLElement[] = [];
    for (const t of targets) {
      const liveEl = live.get(t)!;
      if (liveEl.tagName === 'UL' || liveEl.tagName === 'OL') {
        currentList = liveEl; // already the requested kind — the pressed state said so
        for (const child of liveEl.children) {
          if (child instanceof HTMLElement && child.tagName === 'LI') {
            items.push(child);
          }
        }
        continue;
      }
      let list: HTMLElement | null = currentList;
      if (list !== null && list.nextElementSibling !== liveEl) {
        list = null; // not adjacent to the running list — start a fresh one
      }
      if (list === null) {
        list = document.createElement(type);
        liveEl.replaceWith(list);
        currentList = list;
      }
      const li = document.createElement('li');
      while (liveEl.firstChild !== null) {
        li.appendChild(liveEl.firstChild);
      }
      list.appendChild(li);
      items.push(li);
    }
    if (items.length > 0) {
      restoreSelection(editor, items);
    }
  },

  /** Bold: wrap the selection in `<strong>` in each block it touches;
   *  a selection fully inside one strong unwraps it (toggle). Returns the
   *  wrapper when the command ARMED the format at a bare caret (the caller
   *  tracks it so the text typed next lands inside it — the component's
   *  beforeinput takeover), or null for every non-arming path (a wrap, a
   *  toggle, a disarm, an already-formatted caret) — a null return ends
   *  any arming the caller was tracking. */
  bold(editor: HTMLElement): HTMLElement | null {
    return inlineFormat(editor, 'strong');
  },

  /** Italic: the same, with `<em>`. */
  italic(editor: HTMLElement): HTMLElement | null {
    return inlineFormat(editor, 'em');
  },

  /** Wrap the selection in `<a href>` (one anchor per block it touches —
   *  an anchor cannot legally span blocks). */
  createLink(editor: HTMLElement, url: string): void {
    const range = selectionRangeIn(editor);
    if (range === null || range.collapsed) {
      return;
    }
    const anchors: HTMLElement[] = [];
    for (const block of topBlocks(editor)) {
      const clip = clipToBlock(range, block);
      if (clip === null) {
        continue;
      }
      // A selection sitting entirely inside one existing anchor REWRITES
      // that anchor's href — never nest a second <a> inside it.
      const inner = anchorContainingClip(clip);
      if (inner !== null) {
        inner.setAttribute('href', url);
        anchors.push(inner);
        continue;
      }
      const anchor = wrapRange(clip, () => {
        const a = document.createElement('a');
        a.setAttribute('href', url);
        return a;
      }, 'a');
      if (anchor !== null) {
        anchors.push(anchor);
      }
    }
    if (anchors.length > 0) {
      restoreSelection(editor, anchors);
    }
  },

  /** PASTE: plain text only (predictable, and it cannot smuggle markup
   *  or styles the sanitizer would strip anyway). Newlines become `<br>`. */
  insertPlainText(editor: HTMLElement, text: string): void {
    const range = selectionRangeIn(editor);
    if (range === null) {
      editor.appendChild(document.createTextNode(text));
      return;
    }
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    text.split('\n').forEach((part, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement('br'));
      }
      if (part !== '') {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    if (fragment.childNodes.length > 0) {
      range.insertNode(fragment);
    }
  },
};

/** The top-level (block) elements of the region. */
function topBlocks(editor: HTMLElement): HTMLElement[] {
  return [...editor.children].filter((c): c is HTMLElement => c.nodeType === Node.ELEMENT_NODE);
}

/** The current selection's range, when it lies inside the region. */
function selectionRangeIn(editor: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (sel === null || sel.rangeCount === 0) {
    return null;
  }
  const range = sel.getRangeAt(0).cloneRange();
  return editor.contains(range.commonAncestorContainer) ? range : null;
}

/** The selection clipped to one top-level block (null = no intersection).
 *  Built from `contains()` + `intersectsNode()` on purpose: jsdom's
 *  `Range.compareBoundaryPoints` returns inverted signs for
 *  element/text-level boundaries (verified), so boundary-point math is
 *  not portable across the test environment and real browsers.
 *
 *  "Inside" is the strict descendant test `block.contains(container)`. An
 *  endpoint whose container is the block itself OR an ANCESTOR of it (a
 *  region-level boundary from a whole-block selection) is at/outside the
 *  block, so it clips to the block's edge rather than the raw endpoint. The
 *  earlier `container.contains(block)` term misfired for ancestor containers:
 *  a selection ending at the region level was treated as ending inside every
 *  block, so a cross-block link wrapped all the blocks in a single anchor. */
function clipToBlock(range: Range, block: HTMLElement): Range | null {
  const startInside = block.contains(range.startContainer);
  const endInside = block.contains(range.endContainer);
  if (!startInside && !endInside) {
    // The range straddles the block (a collapsed caret never does — it
    // sits inside exactly one block or in no block at all).
    if (range.collapsed || !range.intersectsNode(block)) {
      return null;
    }
  }
  const clip = document.createRange();
  if (startInside) {
    clip.setStart(range.startContainer, range.startOffset);
  } else {
    clip.setStart(block, 0);
  }
  if (endInside) {
    clip.setEnd(range.endContainer, range.endOffset);
  } else {
    clip.setEnd(block, block.childNodes.length);
  }
  return clip;
}

/** The blocks the selection touches (all of them when there is no
 *  selection — a block choice on an empty region still seeds it). */
/** The anchor that encloses the ENTIRE clip (start and end both inside one
 *  `<a>`), or null. Rewriting such a link changes the anchor's href in place
 *  instead of nesting a fresh anchor inside it. */
function anchorContainingClip(clip: Range): HTMLElement | null {
  let node: Node | null = clip.startContainer;
  while (node !== null) {
    if (node instanceof HTMLElement && node.tagName === 'A') {
      return node.contains(clip.endContainer) ? node : null;
    }
    node = node.parentNode;
  }
  return null;
}

function selectionBlocks(editor: HTMLElement): HTMLElement[] {
  const range = selectionRangeIn(editor);
  const blocks = topBlocks(editor);
  return range === null ? blocks : blocks.filter((b) => clipToBlock(range, b) !== null);
}

/** Wrap a (non-collapsed) range's contents in a fresh element and return
 *  it (null when the range was collapsed — nothing was wrapped). When
 *  `mergeTag` is given, any existing `mergeTag` element inside the extracted
 *  content is unwrapped first, so the re-wrap does not nest a duplicate (e.g.
 *  bolding a span that already contains a `<strong>` merges it, it does not
 *  double it). */
function wrapRange(
  range: Range,
  create: () => HTMLElement,
  mergeTag?: string,
): HTMLElement | null {
  if (range.collapsed) {
    return null;
  }
  const fragment = range.extractContents();
  if (mergeTag !== undefined) {
    for (const t of [...fragment.querySelectorAll(mergeTag)]) {
      unwrapElement(t);
    }
  }
  const wrap = create();
  wrap.appendChild(fragment);
  range.insertNode(wrap);
  return wrap;
}

/**
 * Re-establish the document selection over the content a command just
 * created or moved. A command's `extractContents`/`insertNode` destroys the
 * range it was built from, so without this the caret is left collapsed (or
 * pointing at a detached node): the next keystroke, the pressed state, and a
 * repeat command all read a stale selection — the "glitchy" feel. Restoring
 * the selection over the affected nodes means a repeat command operates on
 * the same content (toggle off) and typing continues where the user looked.
 * Focus stays in the region.
 */
function restoreSelection(editor: HTMLElement, nodes: Node[]): void {
  const sel = window.getSelection();
  if (sel === null || nodes.length === 0) {
    return;
  }
  // Focus FIRST if the region lost focus: focusing a contenteditable resets
  // the selection, so the range is established AFTER the focus to stick.
  // A command must leave both focus in the region AND a live selection on the
  // content it just formatted.
  if (document.activeElement !== null && !editor.contains(document.activeElement)) {
    editor.focus();
  }
  const range = document.createRange();
  range.selectNodeContents(nodes[0]!);
  for (let i = 1; i < nodes.length; i += 1) {
    const tail = document.createRange();
    tail.selectNodeContents(nodes[i]!);
    range.setEnd(tail.endContainer, tail.endOffset);
  }
  sel.removeAllRanges();
  sel.addRange(range);
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

/** The nearest ancestor of `node` with tag `tag`, stopping at `editor`. */
function closestTag(node: Node | null, tag: string, editor: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current !== null && current !== editor) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      (current as Element).tagName.toLowerCase() === tag
    ) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
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

/** A list's items become paragraphs in the list's place (returns them). */
function listToParagraphs(list: HTMLElement): HTMLElement[] {
  const parent = list.parentNode;
  if (parent === null) {
    return [];
  }
  const paragraphs: HTMLElement[] = [];
  for (const child of [...list.children]) {
    const p = document.createElement('p');
    while (child.firstChild !== null) {
      p.appendChild(child.firstChild);
    }
    paragraphs.push(p);
    parent.insertBefore(p, list);
  }
  parent.removeChild(list);
  return paragraphs;
}

/** bold/italic shared. A selection over one existing tag's content
 *  unformats the SELECTED part (the tag splits into halves around it —
 *  the mirror of the wrap direction, never re-merged); a selection
 *  covering the tag's whole text unwraps the tag fully (the toggle); a
 *  COLLAPSED caret ARMS the format — an empty wrapper at the caret, so
 *  the text typed next lands inside it (and disarms again); a selection
 *  outside any such tag wraps per touched block. Returns the armed
 *  wrapper when the command armed, or null otherwise (the null's meaning
 *  is documented on bodyCommands.bold). */
function inlineFormat(editor: HTMLElement, tag: 'strong' | 'em'): HTMLElement | null {
  const range = selectionRangeIn(editor);
  if (range === null) {
    // No selection in the region (the editor was never focused): focus
    // it, seed an empty paragraph when the region is empty (exactly as
    // the block command does), and arm at the start of the content —
    // where a fresh focus lands.
    const first = topBlocks(editor)[0] ?? seedEmptyBlock(editor, 'p');
    editor.focus();
    return armAt(collapsedAt(first, 0), tag);
  }
  if (range.collapsed) {
    const node = range.commonAncestorContainer;
    const wrapper = closestTag(node, tag, editor);
    if (wrapper !== null) {
      // Inside the format: an armed (still empty) wrapper disarms — the
      // caret goes back where the wrapper was; a non-empty one is the
      // already-formatted state, nothing to do. Neither arms — the tracked
      // arming, if any, ends (null): clicking the same button again is the
      // documented "the format ends" way.
      if (isEmptyInline(wrapper)) {
        disarmAt(wrapper);
      }
      return null;
    }
    // A bare caret: ARM — the format waits for the text typed next. A
    // caret with no block under it (an empty, or blockless, region)
    // seeds a paragraph first, exactly as the block command does, and
    // arms at the content's start.
    const block = topBlocks(editor).find((b) => b.contains(node));
    const at =
      block === undefined ? collapsedAt(topBlocks(editor)[0] ?? seedEmptyBlock(editor, 'p'), 0) : range;
    return armAt(at, tag);
  }
  const existing = closestTag(range.commonAncestorContainer, tag, editor);
  if (
    existing !== null &&
    (existing === range.commonAncestorContainer ||
      (existing.contains(range.startContainer) && existing.contains(range.endContainer)))
  ) {
    // The whole selection sits inside one existing tag. One covering the
    // tag's ENTIRE text content unwraps the tag fully — the state a
    // prior command's restoreSelection leaves (the common ancestor IS
    // the tag; a second immediate Bold toggles off) and the whole-word
    // case alike. A shorter one unformats ONLY the selected part: the
    // tag splits into two halves around the now-plain text.
    if (range.toString() === (existing.textContent ?? '')) {
      const contents: Node[] = [...existing.childNodes];
      unwrapElement(existing);
      restoreSelection(editor, contents);
      return null;
    }
    unwrapPartial(editor, existing, range, tag);
    return null;
  }
  const wraps: HTMLElement[] = [];
  for (const block of topBlocks(editor)) {
    const clip = clipToBlock(range, block);
    if (clip !== null) {
      const wrap = wrapRange(clip, () => document.createElement(tag), tag);
      if (wrap !== null) {
        wraps.push(wrap);
      }
    }
  }
  if (wraps.length > 0) {
    restoreSelection(editor, wraps);
  }
  return null;
}

/** A collapsed range at `node`'s `offset`. */
function collapsedAt(node: Node, offset: number): Range {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  return r;
}

/** An armed wrapper that never got text (a `<br>` height-keeper does not
 *  count) — the Bold/Italic the admin armed but did not use. */
function isEmptyInline(el: Element): boolean {
  return (el.textContent ?? '').trim() === '';
}

/** The node in document order immediately after a (collapsed caret's)
 *  position (null at the end of the document). */
function nodeAfterPosition(container: Node, offset: number): Node | null {
  const child = container.childNodes.item(offset);
  if (child !== null) {
    return child;
  }
  let node: Node | null = container;
  while (node !== null) {
    if (node.nextSibling !== null) {
      return node.nextSibling;
    }
    node = node.parentNode;
  }
  return null;
}

/** ARM: an empty `tag` wrapper at the caret, the caret placed INSIDE it
 *  (the text typed next lands inside the wrapper — that is what makes
 *  the format apply to what follows). A `<br>` immediately after the
 *  caret is the line's height-keeper: it goes inside the wrapper too
 *  (browsers wrap it with the format; the empty-semantics rule knows
 *  the `<strong><br></strong>` shape). Returns the wrapper — the caller
 *  tracks it as the armed one (the beforeinput takeover inserts typed
 *  text into it). */
function armAt(range: Range, tag: string): HTMLElement {
  const next = nodeAfterPosition(range.startContainer, range.startOffset);
  const wrap = document.createElement(tag);
  range.insertNode(wrap);
  if (
    next !== null &&
    next !== wrap &&
    next.nodeType === Node.ELEMENT_NODE &&
    (next as Element).tagName === 'BR'
  ) {
    wrap.appendChild(next);
  }
  const sel = window.getSelection();
  if (sel !== null) {
    const caret = document.createRange();
    caret.setStart(wrap, 0);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
  }
  return wrap;
}

/** DISARM: the armed wrapper is still empty — remove it (a `<br>` child
 *  stays: the established empty-line shape) and put the caret back where
 *  the wrapper was. */
function disarmAt(wrapper: HTMLElement): void {
  const parent = wrapper.parentNode;
  if (parent === null) {
    return;
  }
  let index = 0;
  for (let c = parent.firstChild; c !== null && c !== wrapper; c = c.nextSibling) {
    index += 1;
  }
  unwrapElement(wrapper);
  const caret = document.createRange();
  caret.setStart(parent, index);
  caret.collapse(true);
  const sel = window.getSelection();
  if (sel === null) {
    return;
  }
  sel.removeAllRanges();
  sel.addRange(caret);
}

/**
 * Insert `text` at the (collapsed) caret inside the ARMED `wrapper` and
 * leave the caret immediately after the inserted text — the deterministic
 * twin of the browser's native insertion, for the one case where the
 * native one cannot be trusted: a fresh character into a just-armed,
 * still-empty wrapper, which a contenteditable browser may put BESIDE the
 * empty inline instead of inside it (the "format silently clears" bug).
 *
 * The wrapper is NOT re-created per character: every armed keystroke
 * reuses the one the arming created, so "abc" typed after arming Italic
 * is one `<em>abc</em>`, never three wrappers. A `<br>` height-keeper in
 * the wrapper is kept, on the side of the text the caret dictates (armAt
 * left the caret before it, so the text precedes it — the established
 * `<strong>text<br></strong>` shape).
 */
function insertArmedText(wrapper: HTMLElement, range: Range, text: string): void {
  // The zero-length marker pins the caret's position (the standing rule:
  // no boundary-point math — jsdom's compareBoundaryPoints is not
  // portable).
  const marker = placeMarker(range.startContainer, range.startOffset);
  const node = document.createTextNode(text);
  marker.parentNode!.insertBefore(node, marker.nextSibling);
  marker.parentNode!.removeChild(marker);
  const caret = document.createRange();
  caret.setStart(node, text.length);
  caret.collapse(true);
  const sel = window.getSelection();
  if (sel === null) {
    return;
  }
  sel.removeAllRanges();
  sel.addRange(caret);
}

/** A zero-length marker at a range boundary, splitting a text node the
 *  boundary cuts (the boundary then sits BETWEEN two nodes — a place
 *  extractContents can start or end cleanly). */
function placeMarker(container: Node, offset: number): Text {
  const marker = document.createTextNode('');
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container as Text;
    if (offset > 0 && offset < text.data.length) {
      text.splitText(offset);
    }
    // offset 0 -> before the text; offset === length -> after it.
    const before = offset === 0 ? text : text.nextSibling;
    text.parentNode!.insertBefore(marker, before ?? null);
    return marker;
  }
  // An element-level boundary: between its children.
  (container as Element).insertBefore(marker, (container as Element).childNodes[offset] ?? null);
  return marker;
}

/**
 * Unformat only the SELECTED part of a tag: the tag SPLITS into two
 * halves around the now-plain text (`<strong>bold</strong>` with "ol"
 * selected -> `<strong>b</strong>ol<strong>d</strong>`) — the mirror of
 * wrapRange's clip/extract technique. The halves are deliberately NOT
 * re-merged: a repeat command must be able to re-wrap exactly the part
 * that just lost the tag.
 *
 * Two zero-length markers pin the head|selected|tail split across the
 * two extracts (extractContents collapses the range, so the boundaries
 * must survive as nodes) — no boundary-point math anywhere (jsdom's
 * compareBoundaryPoints is not portable, the file's standing rule).
 */
function unwrapPartial(editor: HTMLElement, existing: HTMLElement, range: Range, tag: string): void {
  const parent = existing.parentNode;
  if (parent === null) {
    return;
  }
  // The END marker first: splitting a text node at the end boundary would
  // shift the start boundary's offset if they shared the node.
  const mEnd = placeMarker(range.endContainer, range.endOffset);
  const mStart = placeMarker(range.startContainer, range.startOffset);
  // 1. The selected part (whole nodes only — the markers pin node edges).
  const midRange = document.createRange();
  midRange.setStartAfter(mStart);
  midRange.setEndBefore(mEnd);
  const mid = midRange.extractContents();
  // 2. The tail: from the end marker to the tag's content end.
  const tailRange = document.createRange();
  tailRange.selectNodeContents(existing);
  tailRange.setStartAfter(mEnd);
  const tail = tailRange.extractContents();
  // The markers are left at the head's edge (both extracts started after
  // them) — remove them, wherever they landed.
  for (const m of [mStart, mEnd]) {
    m.parentNode?.removeChild(m);
  }
  // The selected part loses the tag: nested duplicates of it inside
  // unwrap too (the mirror of wrapRange's mergeTag de-dup).
  for (const t of [...mid.querySelectorAll(tag)]) {
    unwrapElement(t);
  }
  // A covered nested element can leave the head holding only empty
  // inlines — drop those (the split's leftover).
  dropEmptyInlines(existing);
  // The mid's children are captured BEFORE the fragment is inserted
  // (inserting a fragment detaches it from its children).
  const midNodes = [...mid.childNodes];
  const ref: Node | null = existing.nextSibling;
  if (existing.firstChild === null) {
    parent.removeChild(existing); // nothing left in the head
  }
  // Both pieces go before the same reference node (the node that followed
  // the tag) — the mid first, then the tail half, in content order.
  if (midNodes.length > 0) {
    parent.insertBefore(mid, ref);
  }
  if (tail.childNodes.length > 0) {
    const tailEl = document.createElement(tag);
    tailEl.appendChild(tail);
    dropEmptyInlines(tailEl);
    if (tailEl.firstChild !== null) {
      parent.insertBefore(tailEl, ref);
    }
  }
  // The selection lands on the just-unformatted part (inside what
  // remains) — a repeat command re-wraps exactly it, the toggle's
  // symmetry.
  restoreSelection(editor, midNodes);
}

/** Remove `strong`/`em` elements that hold no text. An armed-but-unused
 *  wrapper (or a split leftover) must not reach the saved value, and a
 *  region holding only such wrappers still counts as EMPTY for the
 *  blank rule. A `<br>` child stays — the established empty-line shape
 *  (`<p><br></p>`). */
function dropEmptyInlines(root: ParentNode): void {
  for (const el of [...root.querySelectorAll('strong, em')]) {
    if (isEmptyInline(el)) {
      unwrapElement(el);
    }
  }
}

/**
 * The region's DOM mapped to the sanitizer's allowlist — the client-side
 * twin of BodySanitizer: `b`→`strong`, `i`→`em`, `div`→`p` (the tag
 * choices some browsers make natively), every other disallowed element
 * unwrapped to its text (the server's exact treatment), and every
 * attribute dropped except `a[href]` with an allowlisted protocol.
 * Idempotent on stored (already sanitized) HTML, so prefill runs it too.
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
  // The empty inline drop: an armed-but-unused wrapper must not reach the
  // saved value (a `<br>` child stays, so a region of only such wrappers
  // still counts as EMPTY for the blank rule).
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

/**
 * Replace the region's children by parsing `html` as markup. Uses a
 * non-executing DOMParser (the sanitizer's twin) rather than an `innerHTML`
 * write: the input is always the server-sanitized body (or the spec's
 * fixture markup), and keeping the write off an XSS sink leaves the region
 * the unambiguous source of truth while editing — no imperative write can
 * destroy the nodes a live selection points at. DOMParser shares the parser
 * with `innerHTML`, so the round trip re-serializes identically.
 */
function setRegionHtml(region: HTMLElement, html: string): void {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  while (region.firstChild !== null) {
    region.removeChild(region.firstChild);
  }
  const frag = document.createDocumentFragment();
  while (doc.body.firstChild !== null) {
    frag.append(doc.body.firstChild);
  }
  if (frag.childNodes.length > 0) {
    region.append(frag);
  }
}

/** The block kind at a caret/selection point inside the region (the
 *  toolbar's pressed state). */
export function detectBodyBlock(editor: HTMLElement, from: Node): BodyBlock {
  let el: Element | null =
    from.nodeType === Node.ELEMENT_NODE ? (from as Element) : from.parentElement;
  while (el !== null && el !== editor) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h2') {
      return 'h2';
    }
    if (tag === 'h3') {
      return 'h3';
    }
    if (tag === 'li') {
      return el.parentElement?.tagName.toLowerCase() === 'ol' ? 'ol' : 'ul';
    }
    // A blockquote is not a toolbar block (the owner removed the Quote
    // choice) — a caret in one reads as the neutral paragraph state.
    if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
      return 'p';
    }
    el = el.parentElement;
  }
  return 'p';
}

/**
 * The guidance create/edit form (crisis-guidance D8/D9 — the admin
 * authoring surface). The PARENT (AdminPage) owns the save calls and the
 * page-level banners — this component validates (incl. the hero/alt
 * cross-field rule, shown up front so the server's 400 never fires for it)
 * and emits the wire payload on Save. The one exception is the hero
 * upload: it is a self-contained picker flow (upload → refresh the
 * picker list → auto-select the new asset), so the editor calls
 * AdminGateway.uploadMediaAsset itself.
 *
 * The body is a small visual editor: a contenteditable region driven by
 * a toolbar (the `bodyCommands` adapter below). The toolbar offers
 * EXACTLY the BodySanitizer allowlist — no H1 (the public page owns the
 * single `h1`) and no inline images (images are hero-only) — so nothing
 * the admin can produce is lost on save; the region round-trips the
 * stored (server-sanitized) HTML as markup, and the server still
 * re-sanitizes on every write (defence in depth, unchanged).
 */
@Component({
  selector: 'app-guidance-editor',
  imports: [ReactiveFormsModule, TranslatePipe, BannerComponent],
  templateUrl: './guidance-editor.html',
  styleUrl: './guidance-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly save = output<GuidanceEditorSave>();
  readonly cancel = output<void>();

  private readonly admin = inject(AdminGateway);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  /** The editing region (the contenteditable the toolbar drives). */
  private readonly bodyRegionRef = viewChild<ElementRef<HTMLElement>>('bodyRegion');

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

  // ---- the body editor (the visual toolbar over the contenteditable) ------
  /** The toolbar's block choices, in display order (the sanitizer's block
   *  set minus blockquote — the owner does not offer a Quote choice; an
   *  existing blockquote still round-trips, it simply cannot be created
   *  from the toolbar. No h1 either: the public page owns the single h1). */
  readonly BLOCKS: readonly BodyBlock[] = ['p', 'h2', 'h3', 'ul', 'ol'];
  /** The block buttons' labels (MessageKey, so the template pipes them). */
  readonly BLOCK_LABELS: Record<BodyBlock, MessageKey> = {
    p: 'admin.guidance.editor.block.p',
    h2: 'admin.guidance.editor.block.h2',
    h3: 'admin.guidance.editor.block.h3',
    ul: 'admin.guidance.editor.block.ul',
    ol: 'admin.guidance.editor.block.ol',
  };
  /** The block kind at the caret (the block group's pressed state). */
  protected readonly activeBlock = signal<BodyBlock>('p');
  /** The caret sits inside a <strong> (the Bold button's pressed state). */
  protected readonly activeBold = signal(false);
  /** The caret sits inside an <em> (the Italic button's pressed state). */
  protected readonly activeItalic = signal(false);
  /** The wrapper of the format the admin armed with a bare caret and is
   *  still typing into (the empty `<strong>`/`<em>` armAt created; null
   *  = nothing armed). The DOM alone cannot tell "armed, still typing"
   *  from "an unrelated caret that happens to sit in a `<em>`", so the
   *  arming is tracked here rather than derived from the markup: the
   *  Bold/Italic commands set it (their non-null return), and it ends
   *  when the same button is clicked again, the caret leaves the
   *  wrapper, a selection is made, a line break is inserted, or the
   *  region loses focus. While set, the beforeinput handler inserts
   *  typed text INSIDE the wrapper itself — the browser's native
   *  insertion into a just-armed empty inline is not reliable (it may
   *  land beside the wrapper: the reported "format silently clears"). */
  private armedWrapper: HTMLElement | null = null;
  /** The last refused link (the field's error line; a new attempt clears
   *  it). */
  protected readonly linkError = signal<string | null>(null);

  ngOnInit(): void {
    const post = this.post();
    if (post === null) {
      return; // create mode — the form starts blank
    }
    this.form.get('title')?.setValue(post.title);
    this.form.get('slug')?.setValue(post.slug);
    // The editor round-trips what is stored (the sanitizer output).
    this.form.get('body')?.setValue(post.bodyHtml);
    this.form.get('locale')?.setValue(post.locale);
    this.form.get('pinned')?.setValue(post.pinned);
    this.form.get('heroImageId')?.setValue(post.heroImageId);
    this.form.get('heroImageAlt')?.setValue(post.heroImageAlt ?? '');
  }

  ngAfterViewInit(): void {
    const region = this.bodyRegionRef()?.nativeElement;
    if (region === undefined) {
      return;
    }
    // The region exposes a `value` accessor (an innerHTML mirror) — the
    // old textarea's surface, which the specs (and any future harness)
    // drive through: `el.value = '<p>…</p>'`, then an input event. The
    // value IS the server-sanitized body markup (BodySanitizer owns it),
    // the same stored HTML the public detail page renders via [innerHTML].
    Object.defineProperty(region, 'value', {
      get: () => region.innerHTML,
      set: (next: string) => {
        this.endArmedFormat(); // a re-prefill detaches the armed wrapper — the arming ends
        setRegionHtml(region, next);
        this.syncBodyFromRegion();
      },
      configurable: true,
    });
    // The round trip: the stored (server-sanitized) HTML goes in as
    // markup, not text — and comes back out the same way on Save.
    setRegionHtml(region, this.body().value);
    normalizeBodyRegion(region);
    this.body().setValue(region.innerHTML);

    // The toolbar's pressed state follows the selection (the event fires
    // on caret moves too — the signal no-ops on an unchanged value).
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('selectionchange', this.onSelectionChange);
    });
  }

  private readonly onSelectionChange = (): void => {
    this.refreshToolbarState();
    this.checkArmedCaret();
  };

  /** The armed format ends when the caret LEAVES the wrapper or a
   *  (non-collapsed) selection is made — a bare caret that stays inside
   *  the wrapper keeps it armed (the following characters land in it).
   *  Real browsers fire selectionchange for both cases; onBodyBeforeInput
   *  re-checks the same rule as a backstop, so the arming can never
   *  survive where the event does not fire. */
  private checkArmedCaret(): void {
    const wrapper = this.armedWrapper;
    if (wrapper === null || !wrapper.isConnected) {
      return;
    }
    const sel = window.getSelection();
    const range = sel !== null && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const stillInside =
      range !== null && range.collapsed && wrapper.contains(range.startContainer);
    if (!stillInside) {
      this.endArmedFormat();
    }
  }

  /** The editing region (null before the view is ready). */
  private region(): HTMLElement | null {
    return this.bodyRegionRef()?.nativeElement ?? null;
  }

  /** The region's HTML → the form's body control (the wire value). */
  private syncBodyFromRegion(): void {
    const region = this.region();
    if (region !== null) {
      this.body().setValue(region.innerHTML);
    }
  }

  /** The toolbar's pressed state from the current selection (a selection
   *  outside the region reads as the neutral paragraph state). */
  protected refreshToolbarState(): void {
    const region = this.region();
    if (region === null) {
      return;
    }
    const sel = window.getSelection();
    const node = sel !== null && sel.rangeCount > 0 ? sel.anchorNode : null;
    const inside = node !== null && region.contains(node);
    this.activeBlock.set(inside ? detectBodyBlock(region, node) : 'p');
    this.activeBold.set(inside && closestTag(node, 'strong', region) !== null);
    this.activeItalic.set(inside && closestTag(node, 'em', region) !== null);
  }

  /** Typing in the region: the form's body control tracks the region's
   *  HTML — the same `body` string the wire carries. */
  protected onBodyInput(): void {
    this.syncBodyFromRegion();
  }

  /**
   * Paste inserts PLAIN TEXT (predictable, and it cannot smuggle markup
   * or styles the sanitizer would strip anyway — the server unwraps
   * anything it does not keep, so pasted rich text would be lossy in a
   * way the user cannot see).
   */
  protected onBodyPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (text === '') {
      return;
    }
    const region = this.region();
    if (region === null) {
      return;
    }
    bodyCommands.insertPlainText(region, text);
    this.syncBodyFromRegion();
    this.refreshToolbarState();
  }

  /** Ctrl/Cmd+B and Ctrl/Cmd+I — the keyboard spelling of the toolbar's
   *  Bold/Italic (intercepted, so the browser's native <b>/<i> never
   *  reach the wire). */
  protected onBodyKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      this.applyBold();
    } else if (key === 'i') {
      event.preventDefault();
      this.applyItalic();
    }
  }

  /**
   * TYPING WITH AN ARMED FORMAT — the deterministic takeover. Arming
   * (a format clicked at a bare caret) inserts an EMPTY wrapper at the
   * caret and relied on the browser putting the next character inside
   * it; in a contenteditable a browser may instead insert the character
   * BESIDE the empty inline, so the text lands unformatted, the wrapper
   * stays empty, and the save normalizer correctly drops it (the
   * reported "click Italic, type, and it is not italic"). While a format
   * is armed, plain text insertion (`inputType 'insertText'`) is taken
   * over instead: the character is inserted inside the armed wrapper at
   * the caret, the caret lands immediately after it — and the arming
   * STAYS on, so the following characters keep landing in the same
   * wrapper ("abc" typed after arming Italic is one `<em>abc</em>`,
   * never three wrappers).
   *
   * The arming ends (the takeover stops) when: the same button is
   * clicked again (the command returns null, handled in applyBold /
   * applyItalic); the caret leaves the wrapper, a selection is made, or
   * the region blurs (endArmedFormat — checked in checkArmedCaret, here
   * as a backstop, and on blur); a line break (insertParagraph — the
   * caret leaves the wrapper with the new block). On any ending a
   * still-EMPTY wrapper is dropped; a wrapper that already holds typed
   * text keeps it (the format landed there). This is also the guarantee
   * that the format never reaches unrelated text typed much later: the
   * arming always ends the moment the caret is no longer inside the
   * wrapper, and a keystroke anywhere else is never intercepted.
   *
   * Everything else is left to the browser exactly as before: un-armed
   * typing, selection replacements, deletions, and IME composition
   * updates (isComposing — the committed text still arrives as a plain
   * insertText and IS intercepted). The prevented default means no
   * native `input` event follows, so the form value and the toolbar's
   * pressed state are synced by hand.
   */
  protected onBodyBeforeInput(event: InputEvent): void {
    if (event.inputType === 'insertParagraph') {
      // A line break ends the armed format (the caret leaves the wrapper
      // with the new block); the still-empty wrapper is dropped. The
      // paragraph insertion itself stays the browser's.
      this.endArmedFormat();
      return;
    }
    if (event.inputType !== 'insertText' || event.isComposing) {
      return;
    }
    const data = event.data;
    const region = this.region();
    const wrapper = this.armedWrapper;
    if (data === null || data === '' || region === null || wrapper === null) {
      return; // nothing armed — the browser inserts natively (unchanged)
    }
    const sel = window.getSelection();
    const range = sel !== null && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const inside =
      range !== null &&
      range.collapsed &&
      region.contains(range.commonAncestorContainer) &&
      wrapper.isConnected &&
      wrapper.contains(range.startContainer);
    if (!inside) {
      // The caret is not inside the armed wrapper (it moved away, a
      // selection was made, or the region was re-prefilled): the format
      // has ENDED — it must not silently apply to this, unrelated, text.
      // Drop the still-empty wrapper and let the browser insert
      // natively (unformatted) where the caret now is.
      this.endArmedFormat();
      return;
    }
    event.preventDefault();
    insertArmedText(wrapper, range, data);
    this.syncBodyFromRegion();
    this.refreshToolbarState();
  }

  /** The region losing focus ends the armed format (the admin went
   *  elsewhere — the format must not greet text typed later, and an
   *  armed-but-unused wrapper is dropped rather than left behind). */
  protected onBodyBlur(): void {
    this.endArmedFormat();
  }

  /** End the armed format (the endings are documented on
   *  onBodyBeforeInput). A wrapper that never got text is REMOVED — an
   *  armed-but-unused wrapper must not linger in the DOM (the save
   *  normalizer would drop it anyway, and a stray empty inline would
   *  confuse a caret that lands on it); a wrapper that already holds
   *  typed text keeps it. The caret is NOT moved: whichever way the
   *  format ended, the caret stays where the user put it. */
  private endArmedFormat(): void {
    const wrapper = this.armedWrapper;
    if (wrapper === null) {
      return;
    }
    this.armedWrapper = null;
    if (wrapper.isConnected && isEmptyInline(wrapper)) {
      unwrapElement(wrapper);
    }
  }

  /** A block choice (Paragraph / Heading 2 / Heading 3 / lists). */
  protected applyBlock(block: BodyBlock): void {
    const region = this.region();
    if (region === null) {
      return;
    }
    // A block operation is not the format's own toggle — it ends the
    // armed format (a still-empty armed wrapper is dropped).
    this.endArmedFormat();
    if (block === 'ul' || block === 'ol') {
      bodyCommands.toggleList(region, block);
    } else {
      bodyCommands.formatBlock(region, block);
    }
    this.syncBodyFromRegion();
    this.refreshToolbarState();
  }

  protected applyBold(): void {
    const region = this.region();
    if (region === null) {
      return;
    }
    // The command's result IS the arming state: a bare-caret click arms
    // (the wrapper comes back); a selection wrap, a toggle, a disarm, or
    // an already-formatted caret all end any tracked arming.
    const armed = bodyCommands.bold(region);
    if (armed !== null) {
      this.armedWrapper = armed;
    } else {
      this.endArmedFormat();
    }
    this.syncBodyFromRegion();
    this.refreshToolbarState();
  }

  protected applyItalic(): void {
    const region = this.region();
    if (region === null) {
      return;
    }
    const armed = bodyCommands.italic(region);
    if (armed !== null) {
      this.armedWrapper = armed;
    } else {
      this.endArmedFormat();
    }
    this.syncBodyFromRegion();
    this.refreshToolbarState();
  }

  /**
   * The Link control: prompt for the URL, validate the protocol against
   * the sanitizer's allowlist (http/https/mailto) and refuse anything
   * else (including `javascript:`) — a refused link inserts nothing and
   * names the rule in the field's error line.
   */
  protected insertLink(): void {
    const region = this.region();
    if (region === null) {
      return;
    }
    const raw = window.prompt(this.i18n.t('admin.guidance.editor.link.prompt'))?.trim() ?? '';
    if (raw === '') {
      return; // cancelled — nothing to say
    }
    if (!ALLOWED_LINK_PROTOCOL.test(raw)) {
      this.linkError.set(this.i18n.t('admin.guidance.editor.link.invalid'));
      return;
    }
    const sel = window.getSelection();
    const range = sel !== null && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (range === null || range.collapsed || !region.contains(range.commonAncestorContainer)) {
      this.linkError.set(this.i18n.t('admin.guidance.editor.link.noSelection'));
      return;
    }
    this.linkError.set(null);
    // A link requires a selection — selecting the text ended the armed
    // format (a still-empty armed wrapper is dropped).
    this.endArmedFormat();
    bodyCommands.createLink(region, raw);
    this.syncBodyFromRegion();
    this.refreshToolbarState();
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

  /**
   * The hero/alt cross-field rule (the server's 400, shown up front):
   * 'required' = a hero is set with a blank alt; 'forbidden' = an alt
   * without a hero; null = paired correctly. A plain method (not a
   * computed) — the form controls are not signals, so a computed would
   * cache its first evaluation.
   */
  protected heroAltViolation(): 'required' | 'forbidden' | null {
    const hero = this.heroImageId().value;
    const alt = this.heroImageAlt().value.trim();
    if (hero !== null && alt === '') {
      return 'required';
    }
    if (hero === null && alt !== '') {
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
   * The selected hero for the current-image card: the library asset
   * matched by id, falling back to the post's stored hero reference when
   * the library list has not loaded it yet (the serving URL is public).
   */
  /** The picker's list: the assets uploaded in this session (newest
   *  first) over the library (itself newest first). */
  protected pickerAssets(): MediaAssetDto[] {
    return [...this.heroUploads(), ...(this.mediaAssets() ?? [])];
  }

  protected selectedHero(): { url: string; name: string } | null {
    const id = this.heroImageId().value;
    if (id === null) {
      return null;
    }
    const match = this.pickerAssets().find((a) => a.id === id);
    if (match) {
      return { url: match.url, name: match.originalFilename };
    }
    const post = this.post();
    if (post === null || post.heroImageUrl === null) {
      return null;
    }
    return { url: post.heroImageUrl, name: post.heroImageAlt ?? post.title };
  }

  // ---- hero picker -------------------------------------------------------
  /** Pick the asset as the hero (the picker closes; the alt stays as typed
   *  — the cross-field rule takes over when it is blank). */
  selectHero(asset: MediaAssetDto): void {
    this.heroImageId().setValue(asset.id);
    this.heroPickerOpen.set(false);
  }

  /** Clear the hero; the asset itself stays in the media library. */
  removeHero(): void {
    this.heroImageId().setValue(null);
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
    // The wire body: the region's HTML mapped to the allowlist FIRST (a
    // browser-native `div`/`b` artifact is mapped to its allowed
    // equivalent, so the server never sees markup it would strip). The
    // region is null only before the view is ready (unreachable from a
    // real save — the template does not render yet).
    const bodyRegion = this.region();
    if (bodyRegion !== null) {
      normalizeBodyRegion(bodyRegion);
      this.syncBodyFromRegion();
    }
    const alt = this.heroImageAlt().value.trim();
    const hero = this.heroImageId().value;
    if (this.form.invalid) {
      return; // the field errors are rendered from the touched state
    }
    if (hero !== null && alt === '') {
      return; // the altRequired error line is rendered from the violation
    }
    if (hero === null && alt !== '') {
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
      heroImageAlt: hero === null ? null : alt,
    };
    const post = this.post();
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
