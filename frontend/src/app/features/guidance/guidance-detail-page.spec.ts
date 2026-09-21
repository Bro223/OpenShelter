import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Locale } from '../../core/i18n/locale';
import { AuthStore } from '../../session/auth-store';
import type { GuidancePostDto, VerificationLevel } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { DataSourceGateway } from '../../gateways/data-source-gateway';
import { PageShell } from '../../shared/page-shell';
import { GuidanceDetailPage } from './guidance-detail-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics).
    The fake honours the server's locale contract: a slug resolves PER
    LOCALE — a row present in one language is a 404 in the other (and a
    draft is a 404 in every language). The active locale is read from the
    real I18nService, exactly as the real gateway reads it. */
class FakeGuidanceGateway {
  rows = new Map<string, Partial<Record<Locale, GuidancePostDto>>>();
  getBySlug = vi.fn(async (slug: string): Promise<GuidancePostDto> => {
    const locale = TestBed.inject(I18nService).locale();
    const row = this.rows.get(slug)?.[locale];
    if (row === undefined) {
      // A draft slug, an unknown slug, and a slug in ANOTHER locale all
      // answer the same 404 — none of the three is distinguishable.
      throw ApiError.fromHttp(
        404,
        {
          timestamp: 't',
          status: 404,
          error: 'Not Found',
          message: 'Post not found',
          path: `x?locale=${locale}`,
        },
        `/api/guidance/${slug}?locale=${locale}`,
      );
    }
    return row;
  });
  list = vi.fn(async (): Promise<GuidancePostDto[]> => []);
  /** Store a row for the given locales (default: both — most tests don't
      care which language the fake serves the slug in). */
  set(slug: string, post: GuidancePostDto, locales: readonly Locale[] = ['en', 'et']): void {
    const perLocale: Partial<Record<Locale, GuidancePostDto>> = {};
    for (const l of locales) {
      perLocale[l] = post;
    }
    this.rows.set(slug, perLocale);
  }
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
    bodyHtml: '<p>Boil tap water until the authority says otherwise.</p>',
    heroImageUrl: null,
    heroImageAlt: null,
    pinned: false,
    locale: 'en',
    publishedAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-09-02T09:00:00Z',
    alternates: null,
    localeFallback: false,
    ...overrides,
  };
}

/** Navigation target (real app route; the stub keeps the test shell small). */
@Component({ template: '<p>map stub</p>' })
class MapStub {}

describe('GuidanceDetailPage (/blog/:slug)', () => {
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
          { path: 'blog/:slug', component: GuidanceDetailPage },
        ]),
        { provide: GuidanceGateway, useValue: guidanceGateway as unknown as GuidanceGateway },
        { provide: DataSourceGateway, useValue: { fetch: () => Promise.resolve(null) } },
        { provide: AuthStore, useValue: store },
      ],
    });
  });

  async function open(path: string): Promise<{
    page: GuidanceDetailPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;
    router: Router;
  }> {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(PageShell);
    fixture.detectChanges();
    await router.navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(GuidanceDetailPage));
    if (!debug) {
      throw new Error('GuidanceDetailPage not rendered');
    }
    return {
      page: debug.componentInstance,
      element: debug.nativeElement as HTMLElement,
      fixture,
      router,
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

  describe('reading (public)', () => {
    it('renders the title, the publication date and the stored body', async () => {
      guidanceGateway.set('water-and-heating', guidancePost());
      const { element, fixture } = await open('/blog/water-and-heating');

      expect(guidanceGateway.getBySlug).toHaveBeenCalledWith('water-and-heating');

      // One <h1> per page — the post's own title (admin copy, verbatim).
      const h1 = element.querySelector('h1');
      expect(h1?.textContent).toBe('Water and heating in the first days');
      expect(element.querySelectorAll('h1')).toHaveLength(1);

      // The publication date line (locale-aware; the date part is the
      // stable assertion — the time part follows the machine timezone).
      const dateLine = element.querySelector('.guidance-detail__date');
      expect((dateLine?.textContent ?? '').replace(/\s+/g, ' ').trim()).toContain(
        'Published Sep 1, 2025',
      );

      // The stored (server-sanitized) HTML renders as markup, not as text.
      const body = element.querySelector<HTMLElement>('.guidance-detail__body');
      expect(body).not.toBeNull();
      expect(body?.querySelector('p')?.textContent).toBe(
        'Boil tap water until the authority says otherwise.',
      );
      expect(body?.innerHTML).toContain('<p>');
      expect(text(fixture)).not.toContain('<p>Boil'); // not escaped text

      // The back link returns to the index.
      expect(element.querySelector('a.back-link[href="/blog"]')).not.toBeNull();
    });

    it('re-sanitizes client-side: a script tag in the stored body never lands in the DOM', async () => {
      // The server runs the jsoup allowlist first; [innerHTML] then sanitizes
      // the value again before it reaches the DOM, so a body that still carried
      // a script tag cannot inject one. The fixture simulates exactly that.
      guidanceGateway.set(
        'rogue',
        guidancePost({
          slug: 'rogue',
          title: 'Rogue body',
          bodyHtml: '<p>Stay indoors.</p><script>window.__pwned = true;</script>',
        }),
      );
      const { element, fixture } = await open('/blog/rogue');

      const body = element.querySelector<HTMLElement>('.guidance-detail__body');
      expect(body?.querySelector('script')).toBeNull();
      expect(body?.innerHTML).not.toContain('<script');
      // The safe content survives the sanitize pass.
      expect(body?.textContent).toContain('Stay indoors.');
      expect((globalThis as Record<string, unknown>)['__pwned']).toBeUndefined();
      void fixture;
    });

    it('renders a null body as an empty article (no broken state)', async () => {
      guidanceGateway.set(
        'no-body',
        guidancePost({ slug: 'no-body', title: 'Bodyless post', bodyHtml: null }),
      );
      const { element } = await open('/blog/no-body');

      const body = element.querySelector<HTMLElement>('.guidance-detail__body');
      expect(body).not.toBeNull();
      expect(body?.textContent).toBe('');
    });

    it('shows a loading indicator while fetching, then the post', async () => {
      let resolveGet!: (row: GuidancePostDto) => void;
      guidanceGateway.getBySlug = vi.fn(
        () =>
          new Promise<GuidancePostDto>((resolve) => {
            resolveGet = resolve;
          }),
      ) as never;
      const { fixture } = await open('/blog/water-and-heating');
      expect(text(fixture)).toContain('Loading guidance post…');

      resolveGet(guidancePost());
      await settle(fixture);
      expect(text(fixture)).toContain('Water and heating in the first days');
      expect(text(fixture)).not.toContain('Loading guidance post…');
    });

    it('shows an error banner when the fetch fails (500) — chrome intact', async () => {
      guidanceGateway.getBySlug = vi.fn(async (): Promise<GuidancePostDto> => {
        throw ApiError.fromHttp(
          500,
          {
            timestamp: 't',
            status: 500,
            error: 'Internal Server Error',
            message: 'boom',
            path: '/api/guidance/water-and-heating',
          },
          '/api/guidance/water-and-heating',
        );
      }) as never;
      const { element, fixture } = await open('/blog/water-and-heating');

      expect(element.querySelector('.banner--error')).not.toBeNull();
      expect(text(fixture)).toContain('Something went wrong. Please try again.');
      expect(element.querySelector('.guidance-detail__body')).toBeNull();
      // The back link stays — the chrome is intact.
      expect(element.querySelector('a.back-link[href="/blog"]')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Not-found: an unknown slug AND a draft slug answer the same 404 —
  // the page must not reveal which one it hit.
  // ---------------------------------------------------------------------------
  describe('not-found (404)', () => {
    it('shows a readable not-found state for an unknown slug — no error storm', async () => {
      const { element, fixture } = await open('/blog/does-not-exist');

      expect(text(fixture)).toContain('Guidance post not found');
      expect(text(fixture)).toContain(
        'This guidance post does not exist — it may have been unpublished.',
      );
      expect(element.querySelector('.banner--error')).toBeNull();
      expect(element.querySelector('.guidance-detail__body')).toBeNull();
      // One <h1>: the not-found heading (the found-branch h1 is not mounted).
      expect(element.querySelectorAll('h1')).toHaveLength(1);
      // The CTA returns to the index.
      expect(element.querySelector('a.btn[href="/blog"]')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Locale switch: the server answers ONE language per call, and a slug in
  // the other language is a 404 — so a switcher change re-fetches, and a
  // reader switching into the post's language sees it appear (no reload).
  // ---------------------------------------------------------------------------
  describe('locale switch', () => {
    it('a mismatch 404 is the not-found state (no error banner), and switching into the post\'s language renders it', async () => {
      // The post exists ONLY in Estonian.
      const etPost = guidancePost({
        slug: 'vesi-ja-kuumus',
        title: 'Vesi ja kuumus esimesel nädalal',
        locale: 'et',
      });
      guidanceGateway.set('vesi-ja-kuumus', etPost, ['et']);

      // Read in the default (English) UI: the server 404s the other
      // language's slug — the readable not-found state, NOT the error
      // banner.
      const { element, fixture } = await open('/blog/vesi-ja-kuumus');
      expect(guidanceGateway.getBySlug).toHaveBeenCalledTimes(1);
      expect(text(fixture)).toContain('Guidance post not found');
      expect(element.querySelector('.banner--error')).toBeNull();
      expect(element.querySelector('.guidance-detail__body')).toBeNull();

      // Switch to Estonian: the page re-fetches (no reload) and the post
      // renders — the not-found state is left behind.
      TestBed.inject(I18nService).setLocale('et');
      await settle(fixture);

      expect(guidanceGateway.getBySlug).toHaveBeenCalledTimes(2);
      expect(element.querySelector('h1')?.textContent).toBe('Vesi ja kuumus esimesel nädalal');
      expect(element.querySelector('.guidance-detail__body')).not.toBeNull();
      expect(element.querySelector('.banner--error')).toBeNull();

      // And switching back OUT is a 404 again: the same not-found state.
      TestBed.inject(I18nService).setLocale('en');
      await settle(fixture);
      expect(guidanceGateway.getBySlug).toHaveBeenCalledTimes(3);
      expect(text(fixture)).toContain('Guidance post not found');
      expect(element.querySelector('.banner--error')).toBeNull();
    });

    it('a switch while the fetch is in flight re-fetches, and a stale response cannot land', async () => {
      // The post exists ONLY in English; the first fetch (EN) hangs.
      guidanceGateway.set('water-and-heating', guidancePost(), ['en']);
      let resolveFirst!: (row: GuidancePostDto) => void;
      const hanging = () =>
        new Promise<GuidancePostDto>((resolve) => {
          resolveFirst = resolve;
        });
      guidanceGateway.getBySlug = vi.fn(hanging) as never;

      const { element, fixture } = await open('/blog/water-and-heating');
      expect(text(fixture)).toContain('Loading guidance post…');

      // Switch to Estonian while EN is in flight: the ET fetch 404s and
      // lands FIRST (the post is not in Estonian) — and the not-found
      // copy is Estonian, the UI now being in Estonian (the switcher's
      // signal reaches the page through change detection, so settle
      // before the outcome asserts).
      guidanceGateway.getBySlug = vi.fn(async (): Promise<GuidancePostDto> => {
        throw ApiError.fromHttp(
          404,
          { timestamp: 't', status: 404, error: 'Not Found', message: 'Post not found', path: 'x' },
          '/api/guidance/water-and-heating?locale=et',
        );
      }) as never;
      TestBed.inject(I18nService).setLocale('et');
      await settle(fixture);
      expect(text(fixture)).toContain('Juhise artiklit ei leitud');
      expect(element.querySelector('.banner--error')).toBeNull();

      // ...then the STALE EN 200 arrives last: the fetchSeq guard drops
      // it — the not-found state stays (the post is not in Estonian).
      resolveFirst(guidancePost());
      await settle(fixture);
      expect(text(fixture)).toContain('Juhise artiklit ei leitud');
      expect(element.querySelector('h1')?.textContent).not.toBe(
        'Water and heating in the first days',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Hero image (crisis-guidance D1): rendered when the post has one,
  // NOTHING (no element at all) when it does not.
  // ---------------------------------------------------------------------------
  describe('hero image', () => {
    it('renders the hero image with its stored alt when the post has one', async () => {
      guidanceGateway.set(
        'with-hero',
        guidancePost({
          slug: 'with-hero',
          heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
          heroImageAlt: 'A shelter entrance in snow',
        }),
      );
      const { element } = await open('/blog/with-hero');

      const img = element.querySelector<HTMLImageElement>('.guidance-detail__hero');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('/api/media/0123456789abcdef0123456789abcdef.jpg');
      expect(img?.getAttribute('alt')).toBe('A shelter entrance in snow');
      // The stored alt is NOT the post title (which would duplicate the h1).
      expect(img?.getAttribute('alt')).not.toBe('Water and heating in the first days');
      // The hero is the article's first content: above the title header,
      // and the title stays the page's single h1.
      expect(element.querySelector('h1')?.textContent).toBe(
        'Water and heating in the first days',
      );
      expect(element.querySelectorAll('h1')).toHaveLength(1);
      const heroBox = element.querySelector('.guidance-detail__hero');
      const title = element.querySelector('h1');
      expect(
        heroBox !== null &&
          title !== null &&
          (heroBox.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      ).toBe(true); // the hero box precedes the title
    });

    it('a hero with a null alt renders with an empty (decorative) alt — never the title', async () => {
      guidanceGateway.set(
        'hero-no-alt',
        guidancePost({
          slug: 'hero-no-alt',
          title: 'Hero without alt',
          heroImageUrl: '/api/media/fedcba9876543210fedcba9876543210.png',
          heroImageAlt: null,
        }),
      );
      const { element } = await open('/blog/hero-no-alt');

      const img = element.querySelector<HTMLImageElement>('.guidance-detail__hero');
      expect(img?.getAttribute('alt')).toBe('');
      expect(img?.getAttribute('alt')).not.toBe('Hero without alt');
    });

    it('renders NO image element (and no empty frame) when the post has no hero', async () => {
      // The default fixture has heroImageUrl: null / heroImageAlt: null.
      guidanceGateway.set('no-hero', guidancePost({ slug: 'no-hero' }));
      const { element } = await open('/blog/no-hero');

      // The post rendered (chrome + body intact)...
      expect(element.querySelector('h1')?.textContent).toBe(
        'Water and heating in the first days',
      );
      expect(element.querySelector('.guidance-detail__body')).not.toBeNull();
      // ...but the section carries NO <img> at all (the stored body here is
      // plain prose) and NO placeholder frame — asserted on the DOM, not on
      // a class: the absence is the contract.
      const section = element.querySelector('.guidance-detail')!;
      expect(section.querySelectorAll('img').length).toBe(0);
      expect(section.querySelector('.guidance-detail__hero')).toBeNull();
    });

    it('a broken hero takes the neutral placeholder (never a broken-image icon)', async () => {
      guidanceGateway.set(
        'broken-hero',
        guidancePost({
          slug: 'broken-hero',
          heroImageUrl: '/api/media/missing.jpg',
          heroImageAlt: 'Gone',
        }),
      );
      const { element, fixture } = await open('/blog/broken-hero');

      const img = element.querySelector<HTMLImageElement>('.guidance-detail__hero');
      expect(img).not.toBeNull();
      // The stored URL 404s / the network fails: the placeholder box takes
      // the image's place (the index's one-visual-language-for-\"no image\").
      img!.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(element.querySelector('img.guidance-detail__hero')).toBeNull();
      expect(
        element.querySelector('.guidance-detail__hero--failed'),
      ).not.toBeNull();
    });

    it('a failed hero does not carry over to the next slug (the state resets per load)', async () => {
      guidanceGateway.set(
        'broken-a',
        guidancePost({
          slug: 'broken-a',
          title: 'Post A',
          heroImageUrl: '/api/media/broken.jpg',
          heroImageAlt: 'A',
        }),
      );
      guidanceGateway.set(
        'ok-b',
        guidancePost({
          slug: 'ok-b',
          title: 'Post B',
          heroImageUrl: '/api/media/ok.jpg',
          heroImageAlt: 'B',
        }),
      );
      const { element, fixture, router } = await open('/blog/broken-a');
      element.querySelector<HTMLImageElement>('img.guidance-detail__hero')!.dispatchEvent(
        new Event('error'),
      );
      fixture.detectChanges();
      expect(element.querySelector('.guidance-detail__hero--failed')).not.toBeNull();

      await router.navigateByUrl('/blog/ok-b');
      await fixture.whenStable();
      fixture.detectChanges();

      const img = element.querySelector<HTMLImageElement>('.guidance-detail__hero');
      expect(img?.getAttribute('src')).toBe('/api/media/ok.jpg');
      expect(element.querySelector('.guidance-detail__hero--failed')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Param switching (the shelter-detail N7 pattern): back/forward between
  // two posts re-loads the new slug instead of keeping the old post.
  // ---------------------------------------------------------------------------
  describe('slug switching', () => {
    it('a manual URL edit to another post re-loads the new slug', async () => {
      guidanceGateway.set('a', guidancePost({ slug: 'a', title: 'Post A' }));
      guidanceGateway.set('b', guidancePost({ slug: 'b', title: 'Post B' }));
      const { element, fixture, router } = await open('/blog/a');
      expect(guidanceGateway.getBySlug).toHaveBeenCalledWith('a');
      expect(element.querySelector('h1')?.textContent).toBe('Post A');

      // Manual navigation within the same route (no page re-creation).
      await router.navigateByUrl('/blog/b');
      await settle(fixture);

      expect(guidanceGateway.getBySlug).toHaveBeenCalledTimes(2);
      expect(guidanceGateway.getBySlug).toHaveBeenLastCalledWith('b');
      expect(element.querySelector('h1')?.textContent).toBe('Post B');
    });
  });

  // ---------------------------------------------------------------------------
  // Locale fallback (bilingual-guidance): a post without a translation in
  // the reader's language is served in the default locale with the flag —
  // the readable notice names the language being shown and, when
  // `alternates` carries the reader's locale, links that version (the
  // reader's choice; the URL is never switched silently).
  // ---------------------------------------------------------------------------
  describe('locale fallback (bilingual-guidance)', () => {
    it('a fallback shows the notice naming the served language, with no link when alternates lacks the reader locale', async () => {
      const i18nService = TestBed.inject(I18nService);
      i18nService.setLocale('ru');
      // Wait for the ru catalog: the copy below is the RU one (setLocale
      // paints the default-locale copy until the chunk lands — asserting
      // without this wait would be a race).
      await i18nService.ensureCatalog('ru');
      // The post has en + et rows and no ru: the ru reader is served the
      // default-locale (en) copy with the flag (a 200, never a 404).
      guidanceGateway.set(
        'water-and-heating-en',
        guidancePost({
          slug: 'water-and-heating-en',
          locale: 'en',
          localeFallback: true,
          alternates: { en: 'water-and-heating-en', et: 'vesi-ja-kuumutus' },
        }),
        ['ru'],
      );
      const { element, fixture } = await open('/blog/water-and-heating-en');
      fixture.detectChanges();

      const notice = element.querySelector('.guidance-detail__fallback');
      expect(notice).not.toBeNull();
      // The RU chrome copy: the served language (en) and the reader's
      // missing language (ru) are both named.
      expect(notice!.textContent).toContain('Показана версия на языке en');
      expect(notice!.textContent).toContain('недоступен на языке ru');
      // No translation in the reader's language — no link is offered.
      expect(notice!.querySelector('a')).toBeNull();
    });

    it('a fallback offers a link to the reader-locale alternate when alternates carries it (never a silent URL switch)', async () => {
      const i18nService = TestBed.inject(I18nService);
      i18nService.setLocale('ru');
      await i18nService.ensureCatalog('ru');
      guidanceGateway.set(
        'water-and-heating-en',
        guidancePost({
          slug: 'water-and-heating-en',
          locale: 'en',
          localeFallback: true,
          alternates: { en: 'water-and-heating-en', ru: 'voda-i-ogrevanie' },
        }),
        ['ru'],
      );
      const { element, fixture } = await open('/blog/water-and-heating-en');
      fixture.detectChanges();

      const link = element.querySelector<HTMLAnchorElement>('.guidance-detail__fallback-link');
      expect(link).not.toBeNull();
      expect(link!.textContent).toBe('Читать версию на языке ru');
      expect(link!.getAttribute('href')).toBe('/blog/voda-i-ogrevanie');
    });

    it('no notice when a translation exists in the reader language (flag false)', async () => {
      guidanceGateway.set(
        'water-and-heating',
        guidancePost({ alternates: { en: 'water-and-heating' } }),
        ['en'],
      );
      const { element } = await open('/blog/water-and-heating');

      expect(element.querySelector('.guidance-detail__fallback')).toBeNull();
    });
  });
});
