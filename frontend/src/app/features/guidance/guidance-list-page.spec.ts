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

  async function settle(fixture: ReturnType<typeof TestBed.createComponent<PageShell>>): Promise<void> {
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
});
