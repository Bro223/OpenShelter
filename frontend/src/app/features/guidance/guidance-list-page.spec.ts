import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthStore } from '../../session/auth-store';
import type { GuidancePostDto, PagedRows, VerificationLevel } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { DataSourceGateway } from '../../gateways/data-source-gateway';
import { PageShell } from '../../shared/page-shell';
import { GuidanceListPage } from './guidance-list-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeGuidanceGateway {
  rows: GuidancePostDto[] = [];
  /** When set, list/listPage rejects with it (the error-state seam). */
  failure: unknown = null;
  list = vi.fn(async (): Promise<GuidancePostDto[]> => {
    if (this.failure !== null) {
      throw this.failure;
    }
    return this.rows;
  });
  /**
   * Server-style paging — the fake slices its full stable rows the way
   * the endpoint does (offset/limit over the ordered index) and reports
   * the UN-PAGED total (the X-Total-Count contract), so an out-of-range
   * page answers empty posts + a positive total.
   */
  listPage = vi.fn(async (page: number, size: number): Promise<PagedRows<GuidancePostDto>> => {
    if (this.failure !== null) {
      throw this.failure;
    }
    const offset = (page - 1) * size;
    return { rows: this.rows.slice(offset, offset + size), total: this.rows.length };
  });
  getBySlug = vi.fn(async (): Promise<GuidancePostDto> => {
    throw new Error('getBySlug is not used by the list page');
  });
}

/** AuthStore-shaped fake — real signals so zoneless CD stays reactive. */
function fakeAuthStore(
  overrides: { authenticated?: boolean; levels?: VerificationLevel[]; isAdmin?: boolean } = {},
): AuthStore {
  const authenticated = signal(overrides.authenticated ?? false);
  const levels = signal<VerificationLevel[]>(overrides.levels ?? []);
  return {
    authenticated,
    initialized: signal(true),
    levels,
    // admin-moderation D5: the shell's nav item reads this — default false.
    isAdmin: signal(overrides.isAdmin ?? false),
    init: vi.fn(async () => undefined),
    isVerified: () => levels().includes('EMAIL') || levels().includes('PHONE'),
  } as unknown as AuthStore;
}

function guidancePost(overrides: Partial<GuidancePostDto> = {}): GuidancePostDto {
  return {
    slug: 'water-and-heating',
    title: 'Water and heating in the first days',
    bodyHtml: null, // the index never carries the body (D6)
    heroImageUrl: null,
    heroImageAlt: null,
    pinned: false,
    locale: 'en',
    publishedAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-09-02T09:00:00Z',
    // The index never carries alternates (null — kept lean) and never falls
    // back (it lists only the active locale's posts).
    alternates: null,
    localeFallback: false,
    ...overrides,
  };
}

/** Navigation target (real app route; the stub keeps the test shell small). */
@Component({ template: '<p>map stub</p>' })
class MapStub {}

describe('GuidanceListPage (/blog)', () => {
  let guidanceGateway: FakeGuidanceGateway;
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    guidanceGateway = new FakeGuidanceGateway();
    store = fakeAuthStore();
    TestBed.configureTestingModule({
      // The real shell so "page chrome stays intact" is asserted against the
      // actual header/nav, not a stand-in.
      imports: [PageShell],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'blog', component: GuidanceListPage },
        ]),
        { provide: GuidanceGateway, useValue: guidanceGateway as unknown as GuidanceGateway },
        { provide: DataSourceGateway, useValue: { fetch: () => Promise.resolve(null) } },
        { provide: AuthStore, useValue: store },
      ],
    });
  });

  async function open(path: string): Promise<{
    page: GuidanceListPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;
  }> {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(PageShell);
    fixture.detectChanges();
    await router.navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(GuidanceListPage));
    if (!debug) {
      throw new Error('GuidanceListPage not rendered');
    }
    return {
      page: debug.componentInstance,
      element: debug.nativeElement as HTMLElement,
      fixture,
    };
  }

  async function settle(
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>,
  ): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<PageShell>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders the heading, every published post with its date, linked to its detail', async () => {
    guidanceGateway.rows = [
      guidancePost({ pinned: true, publishedAt: '2025-09-05T08:00:00Z' }),
      guidancePost({
        slug: 'power-outages',
        title: 'Power outages',
        publishedAt: '2025-09-01T08:00:00Z',
      }),
    ];
    const { element, fixture } = await open('/blog');

    expect(guidanceGateway.listPage).toHaveBeenCalledTimes(1);
    expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(1, 20);
    // One <h1> per page (the heading); each post row is an h2 link.
    const h1 = element.querySelector('h1');
    expect(h1?.textContent).toBe('Crisis guidance');
    expect(element.querySelectorAll('h1')).toHaveLength(1);

    const links = [...element.querySelectorAll<HTMLAnchorElement>('.guidance-list__posts a')];
    // Server ordering is rendered as-is (pinned first, then publishedAt desc).
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/blog/water-and-heating',
      '/blog/power-outages',
    ]);
    expect(links[0].textContent).toBe('Water and heating in the first days');
    expect(links[1].textContent).toBe('Power outages');

    // The date line under each title (locale-aware; the date part is the
    // stable assertion — the time part follows the machine timezone).
    const dates = [...element.querySelectorAll('.guidance-post__date')].map(
      (d) => d.textContent ?? '',
    );
    expect(dates[0]).toContain('Sep 5, 2025');
    expect(dates[1]).toContain('Sep 1, 2025');

    // The chrome stays intact (the real shell rendered around the page).
    expect(text(fixture)).toContain('Crisis guidance');
    expect(fixture.nativeElement.querySelector('.shell-nav a[href="/blog"]')).not.toBeNull();
  });

  it('shows a loading indicator while fetching, then the posts', async () => {
    let resolveList!: (result: PagedRows<GuidancePostDto>) => void;
    guidanceGateway.listPage = vi.fn(
      () =>
        new Promise<PagedRows<GuidancePostDto>>((resolve) => {
          resolveList = resolve;
        }),
    ) as never;
    const { fixture } = await open('/blog');
    expect(text(fixture)).toContain('Loading guidance…');
    expect(fixture.nativeElement.querySelector('.guidance-list__posts')).toBeNull();

    resolveList({ rows: [guidancePost()], total: 1 });
    await settle(fixture);
    expect(text(fixture)).toContain('Water and heating in the first days');
    expect(text(fixture)).not.toContain('Loading guidance…');
  });

  it('shows the empty state when nothing is published', async () => {
    guidanceGateway.rows = [];
    const { element, fixture } = await open('/blog');

    expect(text(fixture)).toContain('No guidance yet — check back soon.');
    expect(element.querySelector('.guidance-list__posts')).toBeNull();
    // The chrome stays intact; no error banner for an empty index.
    expect(element.querySelector('.banner--error')).toBeNull();
  });

  it('shows an error banner when the index fetch fails', async () => {
    guidanceGateway.failure = ApiError.fromHttp(
      500,
      {
        timestamp: 't',
        status: 500,
        error: 'Internal Server Error',
        message: 'boom',
        path: '/api/guidance',
      },
      '/api/guidance',
    );
    const { element, fixture } = await open('/blog');

    // The shared banner convention: fixed generic copy for 5xx, never the
    // backend message; the heading and chrome stay intact.
    expect(element.querySelector('.banner--error')).not.toBeNull();
    expect(text(fixture)).toContain('Something went wrong. Please try again.');
    expect(element.querySelector('.guidance-list__posts')).toBeNull();
    expect(element.querySelector('.list-state--empty')).toBeNull();
    expect(element.querySelector('h1')?.textContent).toBe('Crisis guidance');
    void fixture;
  });

  // ---------------------------------------------------------------------------
  // Locale switch: the server scopes the index by the reader's active
  // language (the gateway sends it), so a switcher change is a RE-FETCH,
  // not a re-render — no page reload.
  // ---------------------------------------------------------------------------
  describe('locale switch', () => {
    it('refetches the index when the language switcher changes', async () => {
      guidanceGateway.rows = [guidancePost()];
      const { fixture } = await open('/blog');
      expect(guidanceGateway.listPage).toHaveBeenCalledTimes(1);

      // The switcher sets the I18nService locale signal; the server then
      // answers the other language's posts, which the fake serves back.
      guidanceGateway.rows = [guidancePost({ slug: 'vesi-ja-kuumus', title: 'Vesi ja kuumus' })];
      TestBed.inject(I18nService).setLocale('et');
      await settle(fixture);

      expect(guidanceGateway.listPage).toHaveBeenCalledTimes(2);
      // The CURRENT page is re-fetched — page 1 at the default size.
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(1, 20);
      expect(text(fixture)).toContain('Vesi ja kuumus');
      expect(text(fixture)).not.toContain('Water and heating');
    });

    it('drops a superseded response — a stale locale must not land over the new fetch', async () => {
      // The first fetch (EN) hangs in flight...
      let resolveFirst!: (result: PagedRows<GuidancePostDto>) => void;
      const firstFetch = vi.fn(
        () =>
          new Promise<PagedRows<GuidancePostDto>>((resolve) => {
            resolveFirst = resolve;
          }),
      );
      guidanceGateway.listPage = firstFetch as never;
      const { fixture } = await open('/blog');
      expect(firstFetch).toHaveBeenCalledTimes(1);
      expect(text(fixture)).toContain('Loading guidance…');

      // ...and a language switch starts the second fetch (ET) before it
      // resolves. The NEW fetch resolves FIRST... (the switcher's signal
      // reaches the page through change detection, so settle before the
      // second fetch exists and its resolver is captured.)
      let resolveSecond!: (result: PagedRows<GuidancePostDto>) => void;
      const secondFetch = vi.fn(
        () =>
          new Promise<PagedRows<GuidancePostDto>>((resolve) => {
            resolveSecond = resolve;
          }),
      );
      guidanceGateway.listPage = secondFetch as never;
      TestBed.inject(I18nService).setLocale('et');
      await settle(fixture);
      expect(firstFetch).toHaveBeenCalledTimes(1);
      expect(secondFetch).toHaveBeenCalledTimes(1);
      resolveSecond({
        rows: [guidancePost({ slug: 'vesi-ja-kuumus', title: 'Vesi ja kuumus' })],
        total: 1,
      });
      await settle(fixture);
      expect(text(fixture)).toContain('Vesi ja kuumus');

      // ...and the STALE EN response lands LAST: the fetchSeq guard must
      // drop it — the Estonian rows stay on screen.
      resolveFirst({ rows: [guidancePost()], total: 1 });
      await settle(fixture);
      expect(text(fixture)).toContain('Vesi ja kuumus');
      expect(text(fixture)).not.toContain('Water and heating');
    });
  });

  it('renders the hero thumbnail with the stored URL and alt', async () => {
    // A data: URI — the row renders the stored URL verbatim, and no
    // network fetch races the assertions.
    const heroUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: heroUrl, heroImageAlt: 'A kettle on a camp stove' }),
    ];
    const { element } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(heroUrl);
    expect(img?.getAttribute('alt')).toBe('A kettle on a camp stove');
    // The no-layout-shift + lazy-load contract (the admin hero-thumb idiom).
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
    // IMAGE-CACHING CONTRACT (owner report: "guidance pages load images each
    // visit"): the browser was already caching (immutable year-long
    // Cache-Control pinned server-side in GuidanceAuthorizationIT; verified
    // empirically — a reloaded page transfers 0 bytes for an already-seen
    // hero). What the CLIENT controls is pinned here: the no-CLS width/height
    // attributes match the aspect-ratio box, so the lazy decode/land never
    // shifts the card.
    expect(img?.getAttribute('width')).toBe('400');
    expect(img?.getAttribute('height')).toBe('300');
    // The title stays the row's single link (no duplicate link to the post).
    expect(element.querySelectorAll('.guidance-list__posts a')).toHaveLength(1);
  });

  // ---- P2-9: the derivative srcset on the 400 px card thumbnail ------------

  it('the card thumbnail carries the derivative srcset when the server has one (sizes = 400px)', async () => {
    const heroUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const srcset =
      '/api/media/0123456789abcdef0123456789abcdef-t96.jpg 96w, ' +
      '/api/media/0123456789abcdef0123456789abcdef-t192.jpg 192w, ' +
      '/api/media/0123456789abcdef0123456789abcdef-t480.jpg 480w, ' +
      '/api/media/0123456789abcdef0123456789abcdef-t800.jpg 800w';
    guidanceGateway.rows = [
      guidancePost({
        heroImageUrl: heroUrl,
        heroImageAlt: 'A kettle on a camp stove',
        heroImageSrcset: srcset,
      }),
    ];
    const { element } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(heroUrl);
    expect(img?.getAttribute('srcset')).toBe(srcset);
    expect(img?.getAttribute('sizes')).toBe('400px');
  });

  it('a post whose asset has no derivatives renders the plain src only (no srcset attribute)', async () => {
    const mediaUrl = '/api/media/0123456789abcdef0123456789abcdef.jpg';
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: mediaUrl, heroImageAlt: 'A kettle on a camp stove' }),
    ];
    const { element } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(mediaUrl);
    // No srcset attribute — the original renders via plain src.
    expect(img?.hasAttribute('srcset')).toBe(false);
  });

  // ---- Wave 13: real non-square files (the stretch cannot come back) -------
  //
  // The declared geometry of every slot is pinned in app/hero-geometry
  // .spec.ts (natural size / fixed box + cover, per slot). This case
  // drives REAL image files — genuine intrinsic dimensions, not mocked
  // numbers — through the card slot and pins the asymmetry guard the
  // owner's report asked for: a PORTRAIT upload gets the same declared
  // treatment as a landscape one, and the declared box is a cover crop,
  // never a squash.

  it('a real non-square hero — landscape AND portrait alike — renders through the declared 4/3 cover box', async () => {
    // The project's ambient node:fs types only cover the utf8 overload —
    // the cast (the specs' `as unknown as` idiom) reaches the base64 one.
    const readBase64 = readFileSync as unknown as (path: string, encoding: 'base64') => string;
    const dataUrl = (name: string): string =>
      'data:image/png;base64,' +
      readBase64(`${process.cwd()}/test/fixtures/hero/${name}`, 'base64');
    const landscape = dataUrl('landscape-96x64.png'); // a real 96x64 file (3:2)
    const portrait = dataUrl('portrait-64x96.png'); // a real 64x96 file (2:3)
    guidanceGateway.rows = [
      guidancePost({ slug: 'landscape', title: 'Landscape hero', heroImageUrl: landscape }),
      guidancePost({ slug: 'portrait', title: 'Portrait hero', heroImageUrl: portrait }),
    ];
    const { element } = await open('/blog');

    const imgs = [...element.querySelectorAll<HTMLImageElement>('.guidance-post__hero')];
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      // The real file's bytes are served verbatim — the browser decodes
      // the file's OWN ratio (3:2 / 2:3) and the slot must not fight it:
      // the declared box (4/3 + object-fit: cover, hero-geometry.spec.ts)
      // crops the file, and the same declaration applies to the portrait
      // as to the landscape (no different code path, no different shape).
      expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
      expect(img.getAttribute('width')).toBe('400');
      expect(img.getAttribute('height')).toBe('300');
      expect(Number(img.getAttribute('width')!) / Number(img.getAttribute('height')!)).toBeCloseTo(
        4 / 3,
        6,
      );
    }
  });

  it('renders a stored /api/media URL verbatim — no query string or cache-buster', async () => {
    // IMAGE-CACHING CONTRACT: the card thumbnail must hit the SAME browser
    // cache entry as the detail hero. The stored reference (a generated
    // 32-hex name, never reused, served immutable for a year) goes into src
    // UNTOUCHED — no ?v= or any other query, no locale, no absolute origin.
    // A URL that varies between renders would defeat the immutable cache and
    // re-download the 1–3 MB original on every visit.
    const mediaUrl = '/api/media/0123456789abcdef0123456789abcdef.jpg';
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: mediaUrl, heroImageAlt: 'A kettle on a camp stove' }),
    ];
    const { element } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img?.getAttribute('src')).toBe(mediaUrl);
    expect(img?.getAttribute('src')?.includes('?')).toBe(false);
  });

  it('renders a placeholder box for a post without a hero, and still links its title', async () => {
    guidanceGateway.rows = [guidancePost()]; // heroImageUrl + heroImageAlt null
    const { element } = await open('/blog');

    // Card grid — supersedes the old row rule "no image element at all":
    // a hero-less card renders a NEUTRAL PLACEHOLDER BOX of the same
    // aspect ratio, so grid rows stay aligned (no <img>, no broken
    // state). It is the no-hero box, not the load-failure box.
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.guidance-post__thumb')).not.toBeNull();
    expect(element.querySelector('.guidance-post__thumb--failed')).toBeNull();
    const link = element.querySelector<HTMLAnchorElement>('.guidance-list__posts a');
    expect(link?.textContent).toBe('Water and heating in the first days');
    expect(link?.getAttribute('href')).toBe('/blog/water-and-heating');
  });

  it('renders the thumbnail above the title in DOM order (card, not row)', async () => {
    const heroUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: heroUrl, heroImageAlt: 'A kettle on a camp stove' }),
    ];
    const { element } = await open('/blog');

    const card = element.querySelector('.guidance-post') as HTMLElement;
    // The card's direct children, in order: thumbnail -> title -> date
    // (the thumbnail is the card's TOP element, not a row sibling).
    expect([...card.children].map((c) => c.className)).toEqual([
      'guidance-post__hero',
      'guidance-post__title',
      'guidance-post__date',
    ]);
    // DOM order: the thumbnail precedes the title link.
    const img = card.querySelector('.guidance-post__hero') as Element;
    const link = card.querySelector('.guidance-post__title a') as Element;
    expect(img.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('falls back to an empty (decorative) alt when the stored alt is null', async () => {
    const heroUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    guidanceGateway.rows = [guidancePost({ heroImageUrl: heroUrl, heroImageAlt: null })];
    const { element } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img?.getAttribute('src')).toBe(heroUrl);
    // Decorative empty alt — never the post title (it would duplicate the
    // adjacent link text).
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('alt')).not.toContain('Water and heating');
  });

  it('keeps the card aligned when the hero image fails to load (the same placeholder box)', async () => {
    // A data: URI that is not a valid image — it 404s in principle; the
    // synthetic dispatch below makes the failure deterministic either way.
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: 'data:image/gif;base64,not-an-image', heroImageAlt: 'gone' }),
    ];
    const { element, fixture } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img).not.toBeNull();
    expect(() => img?.dispatchEvent(new Event('error'))).not.toThrow();
    await settle(fixture);

    const card = element.querySelector('.guidance-post') as HTMLElement;
    // The placeholder takes the SAME first slot the image held (one
    // visual language for "no image"), so the card's height — and the
    // title + date below it — never shift.
    const thumb = card.querySelector('.guidance-post__thumb') as Element;
    expect(thumb).not.toBeNull();
    expect(card.firstElementChild).toBe(thumb);
    const link = card.querySelector('.guidance-post__title a') as HTMLAnchorElement;
    expect(thumb.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.textContent).toBe('Water and heating in the first days');
    expect(link.getAttribute('href')).toBe('/blog/water-and-heating');
  });

  it('keeps the row usable when the hero image fails to load', async () => {
    // A data: URI that is not a valid image — it 404s in principle; the
    // synthetic dispatch below makes the failure deterministic either way.
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: 'data:image/gif;base64,not-an-image', heroImageAlt: 'gone' }),
    ];
    const { element, fixture } = await open('/blog');

    const img = element.querySelector<HTMLImageElement>('.guidance-post__hero');
    expect(img).not.toBeNull();
    // No exception: the handler swallows the error into the failure set.
    expect(() => img?.dispatchEvent(new Event('error'))).not.toThrow();
    await settle(fixture);

    // The broken <img> is gone — a broken-image icon is never the feedback.
    expect(element.querySelector('.guidance-post__hero')).toBeNull();
    // The fixed-size placeholder box stays (the row keeps its height).
    expect(element.querySelector('.guidance-post__thumb--failed')).not.toBeNull();
    // The title link survives the error, still pointing at the post.
    const link = element.querySelector<HTMLAnchorElement>('.guidance-list__posts a');
    expect(link?.textContent).toBe('Water and heating in the first days');
    expect(link?.getAttribute('href')).toBe('/blog/water-and-heating');
  });

  // ---------------------------------------------------------------------------
  // Paging (guidance-index-paging / list-page-paging): the view is the URL
  // (?page, ?size — defaults 1 and 20 omitted from the URL), the SERVER
  // does the slicing, the control is pointless at one page, and an
  // out-of-range page is an explicit state, never a bare empty list.
  // ---------------------------------------------------------------------------
  describe('paging', () => {
    function manyPosts(n: number): GuidancePostDto[] {
      return Array.from({ length: n }, (_, i) =>
        guidancePost({ slug: `post-${i + 1}`, title: `Post ${i + 1}` }),
      );
    }

    function navButtons(element: HTMLElement): HTMLButtonElement[] {
      return Array.from(
        (element.querySelector('nav.pagination') as HTMLElement).querySelectorAll('button'),
      ) as HTMLButtonElement[];
    }

    it('hides the pagination control at one page (no pointless chrome)', async () => {
      guidanceGateway.rows = manyPosts(15);
      const { element } = await open('/blog');
      expect(element.querySelectorAll('.guidance-post')).toHaveLength(15);
      expect(element.querySelector('nav.pagination')).toBeNull();
    });

    it('renders the control at two pages: the status line, prev disabled on page one', async () => {
      guidanceGateway.rows = manyPosts(25);
      const { element } = await open('/blog');
      const nav = element.querySelector('nav.pagination') as HTMLElement;
      expect(nav).not.toBeNull();
      expect(nav.getAttribute('aria-label')).toBe('Pages');
      expect(nav.textContent).toContain('Page 1 of 2');
      const [prev, next] = navButtons(element);
      expect(prev.disabled).toBe(true);
      expect(next.disabled).toBe(false);
      // The size selector shows the effective (default) size.
      const select = nav.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('20');
    });

    it('writes the page to the URL on next and fetches offset=(page-1)*size', async () => {
      guidanceGateway.rows = manyPosts(25);
      const { element, fixture } = await open('/blog');
      const router = TestBed.inject(Router);

      const [_, next] = navButtons(element);
      next.click();
      await settle(fixture);

      expect(router.url).toBe('/blog?page=2');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(2, 20);
      // Page two shows the REMAINDER (5 of 25) and prev is now enabled.
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.guidance-post'),
      ).toHaveLength(5);
      const [prev] = navButtons(fixture.nativeElement as HTMLElement);
      expect(prev.disabled).toBe(false);
    });

    it('shows the honest out-of-range state for a page past the end — never a bare empty list', async () => {
      guidanceGateway.rows = manyPosts(25); // 2 pages at 20
      const { element, fixture } = await open('/blog?page=5');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(5, 20);

      // The explicit notice with the real last page, not the empty state.
      expect(element.querySelector('.list-state--oob')).not.toBeNull();
      expect(element.querySelector('.list-state--empty')).toBeNull();
      expect(text(fixture)).toContain('Page 5 does not exist — the index ends at page 2.');

      // The first-page action returns to /blog and the first page's rows.
      const button = element.querySelector('.list-state--oob button') as HTMLButtonElement | null;
      if (!button) {
        throw new Error('the out-of-range first-page action was not rendered');
      }
      button.click();
      await settle(fixture);
      expect(TestBed.inject(Router).url).toBe('/blog');
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.guidance-post'),
      ).toHaveLength(20);
    });

    it('keeps a non-default size in the URL and fetches with it', async () => {
      guidanceGateway.rows = manyPosts(90);
      const { element } = await open('/blog?size=50');
      expect(TestBed.inject(Router).url).toBe('/blog?size=50');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(1, 50);
      expect(element.querySelectorAll('.guidance-post')).toHaveLength(50);
      // Two pages at 50; the selector shows the effective size.
      const select = element.querySelector('nav.pagination select') as HTMLSelectElement;
      expect(select.value).toBe('50');
    });

    it('clamps a size change that would strand the current page past the last one', async () => {
      guidanceGateway.rows = manyPosts(90); // 9 pages at 10
      const { element, fixture } = await open('/blog?page=9&size=10');
      expect(TestBed.inject(Router).url).toBe('/blog?page=9&size=10');
      expect(element.querySelectorAll('.guidance-post')).toHaveLength(10);

      const select = element.querySelector('nav.pagination select') as HTMLSelectElement;
      select.value = '50';
      select.dispatchEvent(new Event('change'));
      await settle(fixture);

      // 90 rows at 50 = 2 pages: page 9 clamps to page 2 — never a dead page.
      expect(TestBed.inject(Router).url).toBe('/blog?page=2&size=50');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(2, 50);
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.guidance-post'),
      ).toHaveLength(40);
    });

    it('normalizes a hand-typed size off the 10..100 step to the nearest member (replaceUrl)', async () => {
      guidanceGateway.rows = manyPosts(45);
      await open('/blog?size=37');
      // 37 -> 40, written back in place (no history entry for the cosmetic fix).
      expect(TestBed.inject(Router).url).toBe('/blog?size=40');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(1, 40);
    });

    it('normalizes a hand-typed page below 1 to the clean /blog URL', async () => {
      guidanceGateway.rows = manyPosts(25);
      await open('/blog?page=0');
      expect(TestBed.inject(Router).url).toBe('/blog');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(1, 20);
    });

    it('refetches the CURRENT page on a locale switch (no URL change)', async () => {
      guidanceGateway.rows = manyPosts(25);
      const { fixture } = await open('/blog?page=2');
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(2, 20);

      guidanceGateway.rows = manyPosts(12); // ET has fewer posts
      TestBed.inject(I18nService).setLocale('et');
      await settle(fixture);

      // The same page is re-fetched at the same size...
      expect(guidanceGateway.listPage).toHaveBeenLastCalledWith(2, 20);
      // ...and 12 rows at 20 = 1 page: page 2 is now past the end, so the
      // honest out-of-range state shows (in the NEW active locale — the
      // switcher changed it to Estonian), not a bare empty list.
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('.list-state--oob'),
      ).not.toBeNull();
      expect(text(fixture)).toContain('Lehe 2 ei ole — nimestik lõppeb lehel 1.');
    });
  });

  // ---------------------------------------------------------------------------
  // 360px viewport (M13, mobile-responsive-polish): no page-level horizontal
  // overflow. jsdom cannot measure a 360px viewport (it has no layout engine —
  // every offsetWidth/scrollWidth is 0), so — exactly like the M13 pins in
  // shelter-detail-page.spec.ts / submit-shelter-page.scss — the mechanisms
  // that make overflow impossible are pinned against the stylesheet instead
  // of a viewport measurement. 360px viewport − 2 × 20px .shell-body padding
  // (page-shell.scss) = 320px of content on /blog.
  // ---------------------------------------------------------------------------
  describe('no page-level horizontal overflow at 360px (M13 mechanism)', () => {
    const readListScss = (): string =>
      readFileSync(`${process.cwd()}/src/app/features/guidance/guidance-list-page.scss`, 'utf8');

    it('the card grid derives its column count from the container width, and the 200px card floor is ≤ the 320px of content at 360px — one column always fits, a wider floor would make even ONE card wider than the viewport', () => {
      const scss = readListScss();
      const grid = scss.match(/\.guidance-list__posts \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(grid, 'the post grid rule must exist').not.toEqual('');
      // auto-fill computes the column COUNT from the container width. A fixed
      // count (repeat(4, …)) would force four tracks and overflow every
      // viewport narrower than 4 × the floor + the gaps.
      expect(
        grid,
        'the column count must derive from the container (auto-fill), with a px floor',
      ).toMatch(/repeat\(auto-fill,\s*minmax\(\d+px,\s*1fr\)\)/);
      const floor = Number(grid.match(/minmax\((\d+)px/)?.[1]);
      expect(
        floor,
        'the card floor must be ≤ 320px (the /blog content width at 360px)',
      ).toBeLessThanOrEqual(320);
    });

    it('a card may shrink below its content size (min-width: 0) — a long unbreakable title stretches its text, never the grid track it sits in', () => {
      const scss = readListScss();
      const card = scss.match(/\.guidance-post \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(card, 'the card rule must exist').not.toEqual('');
      // Without min-width: 0 the grid item's automatic minimum is its
      // min-content size: a title without a break opportunity (a long URL-ish
      // word) would push the 200px track past 320px and the page scrolls
      // horizontally.
      expect(card, 'the card must be allowed to shrink below its min-content width').toContain(
        'min-width: 0',
      );
    });

    it('the hero thumbnail is the card width (width: 100%), never the 400px the <img> attributes declare — at 320px of content the attribute width would be 180px wider than the viewport content', () => {
      const scss = readListScss();
      const thumb = scss.match(/\.guidance-post__hero,([\s\S]*?)\n\}/)?.[0] ?? '';
      expect(thumb, 'the hero/thumb rule must exist').not.toEqual('');
      // The template pins width="400" height="300" on the <img> (the layout-
      // shift budget: the box is reserved before the image loads). The CSS
      // width: 100% is what re-bounds that box to the card — remove it and
      // the thumbnail is its attribute width, 400px, in a 320px column.
      expect(thumb, 'the thumbnail must be re-bounded to the card width').toContain('width: 100%');
    });

    it('no element on the index forbids a line break (no nowrap anywhere — every text line keeps its break opportunities)', () => {
      const scss = readListScss();
      expect(
        scss,
        'titles and dates are unbounded server strings — a nowrap would turn the first long one into page-level overflow',
      ).not.toMatch(/white-space:\s*nowrap/);
    });
  });
});
