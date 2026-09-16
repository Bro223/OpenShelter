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
import { GuidanceDetailPage } from './guidance-detail-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeGuidanceGateway {
  rows = new Map<string, GuidancePostDto>();
  getBySlug = vi.fn(async (slug: string): Promise<GuidancePostDto> => {
    const row = this.rows.get(slug);
    if (row === undefined) {
      // A draft slug and an unknown slug answer the same 404, so a draft is
      // never distinguishable from a post that does not exist.
      throw ApiError.fromHttp(
        404,
        {
          timestamp: 't',
          status: 404,
          error: 'Not Found',
          message: 'Post not found',
          path: 'x',
        },
        `/api/guidance/${slug}`,
      );
    }
    return row;
  });
  list = vi.fn(async (): Promise<GuidancePostDto[]> => []);
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
      guidanceGateway.rows.set('water-and-heating', guidancePost());
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
      guidanceGateway.rows.set(
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
      guidanceGateway.rows.set(
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
  // Param switching (the shelter-detail N7 pattern): back/forward between
  // two posts re-loads the new slug instead of keeping the old post.
  // ---------------------------------------------------------------------------
  describe('slug switching', () => {
    it('a manual URL edit to another post re-loads the new slug', async () => {
      guidanceGateway.rows.set('a', guidancePost({ slug: 'a', title: 'Post A' }));
      guidanceGateway.rows.set('b', guidancePost({ slug: 'b', title: 'Post B' }));
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
});
