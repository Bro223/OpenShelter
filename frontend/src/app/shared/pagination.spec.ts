import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination (the shared page + size control)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Pagination>>;
  /** The emitted navigation intents, in order. */
  const emissions: Array<{ page: number; size: number }> = [];

  function create(): void {
    fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.instance.onNavigate.subscribe((event) => emissions.push(event));
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pages', 5);
    fixture.componentRef.setInput('size', 20);
    fixture.detectChanges();
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  }

  beforeEach(() => {
    emissions.length = 0;
    TestBed.configureTestingModule({});
  });

  it('renders NOTHING at one page — no pointless chrome', () => {
    fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pages', 1);
    fixture.componentRef.setInput('size', 20);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('renders NOTHING at zero pages (an empty list)', () => {
    fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pages', 0);
    fixture.componentRef.setInput('size', 20);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('renders an accessible nav with the page status at two or more pages', () => {
    create();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Pages');
    const status = fixture.nativeElement.querySelector('.pagination__status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('Page 2 of 5');
  });

  it('emits prev/next with the CURRENT size and disables at the boundaries', () => {
    create();
    const [prev, next] = buttons();
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(false);

    prev.click();
    next.click();
    expect(emissions).toEqual([
      { page: 1, size: 20 },
      { page: 3, size: 20 },
    ]);

    // Boundary: page 1 disables prev, the last page disables next.
    fixture.componentRef.setInput('page', 1);
    fixture.detectChanges();
    expect(buttons()[0].disabled).toBe(true);
    fixture.componentRef.setInput('page', 5);
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBe(true);
  });

  it('emits the new size (keeping the page) when the selector changes', () => {
    create();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('20');

    select.value = '50';
    select.dispatchEvent(new Event('change'));
    expect(emissions).toEqual([{ page: 2, size: 50 }]);
  });

  it('offers 10..100 in steps of 10 by default and the host can narrow the list', () => {
    create();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const offered = Array.from(select.querySelectorAll('option')).map((o) => Number(o.value));
    expect(offered).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

    fixture.componentRef.setInput('sizes', [10, 20]);
    fixture.detectChanges();
    const narrowed = Array.from(
      (fixture.nativeElement.querySelector('select') as HTMLSelectElement).querySelectorAll('option'),
    ).map((o) => Number(o.value));
    expect(narrowed).toEqual([10, 20]);
  });

  it('is keyboard-reachable: real <button>s and a native <select>, no tabindex tricks', () => {
    create();
    const interactive = Array.from(
      fixture.nativeElement.querySelectorAll('button, select'),
    ) as Element[];
    expect(interactive.length).toBe(3);
    for (const el of interactive) {
      const tabIndex = Number(el.getAttribute('tabindex') ?? '0');
      expect(tabIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
