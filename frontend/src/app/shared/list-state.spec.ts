import { TestBed } from '@angular/core/testing';
import { ListState } from './list-state';

/**
 * The shared paged-list state (list-state): the out-of-range notice +
 * first-page action, and the bare empty notice. Presentation only — the
 * URL-normalization behaviour itself is pinned per surface (the page specs
 * assert the normalized router.url); here the contract is that the action
 * EMITS the intent, the host owns the URL.
 */
describe('ListState (the shared out-of-range / empty state)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ListState>>;
  let emissions: number;

  function create(
    kind: 'out-of-range' | 'empty',
    messageKey: 'guidance.pageOutOfRange' | 'guidance.empty',
    actionKey: 'guidance.pageFirst' | null,
    page = 5,
    pages = 2,
  ): void {
    fixture = TestBed.createComponent(ListState);
    fixture.componentRef.instance.onGoFirstPage.subscribe(() => emissions++);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('messageKey', messageKey);
    fixture.componentRef.setInput('actionKey', actionKey);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pages', pages);
    fixture.detectChanges();
  }

  const text = (el: HTMLElement): string => (el.textContent ?? '').trim();

  beforeEach(() => {
    emissions = 0;
    TestBed.configureTestingModule({});
  });

  it('out-of-range: renders the notice with the real page and last page, role=status', () => {
    create('out-of-range', 'guidance.pageOutOfRange', 'guidance.pageFirst', 5, 2);
    const oob = fixture.nativeElement.querySelector('.list-state--oob') as HTMLElement;
    expect(oob).not.toBeNull();
    expect(oob.getAttribute('role')).toBe('status');
    expect(text(oob)).toContain('Page 5 does not exist — the index ends at page 2.');
  });

  it('out-of-range: the first-page action renders the host label and emits the intent', () => {
    create('out-of-range', 'guidance.pageOutOfRange', 'guidance.pageFirst', 5, 2);
    const button = fixture.nativeElement.querySelector(
      '.list-state--oob button',
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(text(button!)).toBe('Show the first page');

    button!.click();
    expect(emissions).toBe(1);
  });

  it('out-of-range: actionKey null renders the notice without the action (no intent to emit)', () => {
    create('out-of-range', 'guidance.pageOutOfRange', null, 5, 2);
    expect(fixture.nativeElement.querySelector('.list-state--oob button')).toBeNull();
    expect(text(fixture.nativeElement)).toContain(
      'Page 5 does not exist — the index ends at page 2.',
    );
  });

  it('empty: renders the notice only — no action, nothing to emit', () => {
    create('empty', 'guidance.empty', null);
    const empty = fixture.nativeElement.querySelector('.list-state--empty') as HTMLElement;
    expect(empty).not.toBeNull();
    expect(empty.getAttribute('role')).toBe('status');
    expect(text(empty)).toBe('No guidance yet — check back soon.');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.list-state--oob')).toBeNull();
  });
});
