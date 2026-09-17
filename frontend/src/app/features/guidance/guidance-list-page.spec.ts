import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type { GuidancePostDto, VerificationLevel } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { DataSourceGateway } from '../../gateways/data-source-gateway';
import { PageShell } from '../../shared/page-shell';
import { GuidanceListPage } from './guidance-list-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeGuidanceGateway {
  rows: GuidancePostDto[] = [];
  /** When set, list() rejects with it (the error-state seam). */
  failure: unknown = null;
  list = vi.fn(async (): Promise<GuidancePostDto[]> => {
    if (this.failure !== null) {
      throw this.failure;
    }
    return this.rows;
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

    expect(guidanceGateway.list).toHaveBeenCalledTimes(1);
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
    let resolveList!: (rows: GuidancePostDto[]) => void;
    guidanceGateway.list = vi.fn(
      () =>
        new Promise<GuidancePostDto[]>((resolve) => {
          resolveList = resolve;
        }),
    ) as never;
    const { fixture } = await open('/blog');
    expect(text(fixture)).toContain('Loading guidance…');
    expect(fixture.nativeElement.querySelector('.guidance-list__posts')).toBeNull();

    resolveList([guidancePost()]);
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
    expect(element.querySelector('.guidance-list__empty')).toBeNull();
    expect(element.querySelector('h1')?.textContent).toBe('Crisis guidance');
  });

  it('renders the hero thumbnail with the stored URL and alt', async () => {
    // A data: URI — the row renders the stored URL verbatim, and no
    // network fetch races the assertions.
    const heroUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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
    // The title stays the row's single link (no duplicate link to the post).
    expect(element.querySelectorAll('.guidance-list__posts a')).toHaveLength(1);
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
    const heroUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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
    const heroUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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
});
