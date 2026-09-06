import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RatingStars } from './rating-stars';

/** Host that owns the selection state the way ReviewForm will (signals — zoneless). */
@Component({
  imports: [RatingStars],
  template: `<app-rating-stars
    [mode]="mode()"
    [rating]="rating()"
    [selected]="selected()"
    (selectionChange)="onPick($event)"
  />`,
})
class Host {
  mode = signal<'display' | 'input'>('display');
  rating = signal<number | null>(4.2);
  selected = signal<number | null>(null);
  picks: number[] = [];

  onPick(value: number): void {
    this.picks.push(value);
    this.selected.set(value);
  }
}

describe('RatingStars', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function stars(): HTMLSpanElement[] {
    return [...host().querySelectorAll<HTMLElement>('.rating-stars .star')];
  }

  function fills(): number[] {
    return stars().map(
      (s) => Number((s.querySelector('.star__fill') as HTMLElement).style.width.replace('%', '')),
    );
  }

  function buttons(): HTMLButtonElement[] {
    return [...host().querySelectorAll<HTMLButtonElement>('.star-btn')];
  }

  function key(btn: HTMLElement, keyName: string): void {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  describe('display mode', () => {
    it('renders whole averages with full stars and the numeric value', () => {
      fixture.componentInstance.rating.set(4.0);
      fixture.detectChanges();

      const strip = host().querySelector('[role="img"]');
      expect(strip?.getAttribute('aria-label')).toBe('4.0 out of 5');
      expect(fills()).toEqual([100, 100, 100, 100, 0]);
      expect(host().querySelector('.rating-value')?.textContent?.trim()).toBe('4.0');
    });

    it('renders fractional averages with a partially filled star', () => {
      fixture.componentInstance.rating.set(4.2);
      fixture.detectChanges();

      const strip = host().querySelector('[role="img"]');
      expect(strip?.getAttribute('aria-label')).toBe('4.2 out of 5');
      expect(fills()).toEqual([100, 100, 100, 100, 20]);
      expect(host().querySelector('.rating-value')?.textContent?.trim()).toBe('4.2');
    });

    it('renders half-star averages', () => {
      fixture.componentInstance.rating.set(3.5);
      fixture.detectChanges();

      expect(fills()).toEqual([100, 100, 100, 50, 0]);
      expect(host().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('3.5 out of 5');
    });

    it('renders a sub-one average on the first star only', () => {
      fixture.componentInstance.rating.set(0.5);
      fixture.detectChanges();

      expect(fills()).toEqual([50, 0, 0, 0, 0]);
    });

    it('renders null as "No ratings yet" — never an invented zero', () => {
      fixture.componentInstance.rating.set(null);
      fixture.detectChanges();

      const strip = host().querySelector('[role="img"]');
      expect(strip?.getAttribute('aria-label')).toBe('No ratings yet');
      expect(fills()).toEqual([0, 0, 0, 0, 0]);
      expect(host().querySelector('.rating-value')).toBeNull();
    });
  });

  describe('input mode', () => {
    beforeEach(() => {
      fixture.componentInstance.mode.set('input');
      fixture.detectChanges();
    });

    it('renders a keyboard-operable radio group over 1–5', () => {
      const group = host().querySelector('[role="radiogroup"]');
      expect(group).not.toBeNull();
      expect(group?.getAttribute('aria-label')).toBe('Rating');

      const btns = buttons();
      expect(btns.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Rate 1 star',
        'Rate 2 stars',
        'Rate 3 stars',
        'Rate 4 stars',
        'Rate 5 stars',
      ]);
      expect(btns.every((b) => b.getAttribute('role') === 'radio')).toBe(true);
      expect(btns.map((b) => b.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'false',
        'false',
        'false',
      ]);
      // Roving tabindex: the first star is the keyboard entry point.
      expect(btns.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    });

    it('a click selects the star and emits the value once', () => {
      buttons()[2].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.picks).toEqual([3]);
      const btns = buttons();
      expect(btns.map((b) => b.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'true',
        'false',
        'false',
      ]);
      // Focus follows the selection (radio pattern).
      expect(document.activeElement).toBe(btns[2]);

      // Re-clicking the selected star does not re-emit.
      buttons()[2].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.picks).toEqual([3]);
    });

    it('arrow keys move and select the neighbouring star', () => {
      const btns = buttons();
      btns[1].focus();
      key(btns[1], 'ArrowRight'); // from star 2 -> star 3
      expect(fixture.componentInstance.picks).toEqual([3]);
      expect(document.activeElement).toBe(buttons()[2]);

      key(buttons()[2], 'ArrowLeft'); // back to star 2
      expect(fixture.componentInstance.picks).toEqual([3, 2]);

      // Clamps at the bottom end (no wrap): ArrowLeft on star 1 selects 1,
      // a second press is a no-op.
      key(buttons()[0], 'ArrowLeft');
      expect(fixture.componentInstance.picks).toEqual([3, 2, 1]);
      key(buttons()[0], 'ArrowLeft');
      expect(fixture.componentInstance.picks).toEqual([3, 2, 1]);
    });

    it('Home/End jump to 1 and 5', () => {
      const btns = buttons();
      key(btns[2], 'Home');
      expect(fixture.componentInstance.picks).toEqual([1]);
      key(buttons()[0], 'End');
      expect(fixture.componentInstance.picks).toEqual([1, 5]);
    });

    it('digit keys select the matching star directly', () => {
      buttons()[0].focus();
      key(buttons()[0], '4');
      expect(fixture.componentInstance.picks).toEqual([4]);
      expect(document.activeElement).toBe(buttons()[3]);
    });

    it('ignores keys that do not map to a selection', () => {
      buttons()[0].focus();
      key(buttons()[0], 'a');
      key(buttons()[0], '0');
      key(buttons()[0], 'Enter');
      expect(fixture.componentInstance.picks).toEqual([]);
    });
  });
});
