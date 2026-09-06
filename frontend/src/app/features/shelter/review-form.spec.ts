import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReviewForm } from './review-form';

/** Host mirroring how ShelterDetailPage drives the form (signals — zoneless). */
@Component({
  imports: [ReviewForm],
  template: `<app-review-form
    [mode]="mode()"
    [initialRating]="initialRating()"
    [initialComment]="initialComment()"
    (save)="onSave($event)"
    (deleteReview)="onDelete()"
  />`,
})
class Host {
  mode = signal<'add' | 'edit'>('add');
  initialRating = signal<number | null>(null);
  initialComment = signal<string | null>(null);
  saved: { rating: number; comment: string | null }[] = [];
  deleted = 0;

  onSave(review: { rating: number; comment: string | null }): void {
    this.saved.push(review);
  }

  onDelete(): void {
    this.deleted++;
  }
}

describe('ReviewForm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function starButtons(): HTMLButtonElement[] {
    return [...host().querySelectorAll<HTMLButtonElement>('.star-btn')];
  }

  function commentInput(): HTMLTextAreaElement {
    return host().querySelector('#review-comment') as HTMLTextAreaElement;
  }

  function saveButton(): HTMLButtonElement {
    return host().querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function form(): HTMLFormElement {
    return host().querySelector('form') as HTMLFormElement;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('is in add mode by default with a hidden delete control', () => {
    expect(host().textContent).toContain('Rate this shelter');
    expect(host().querySelector('form')).not.toBeNull();
    expect(host().querySelector('.btn--danger')).toBeNull(); // no delete in add mode
  });

  it('requires a rating: save stays disabled and a forced submit shows an inline error', () => {
    expect(saveButton().disabled).toBe(true);

    form().requestSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.saved).toEqual([]);
    expect(host().textContent).toContain('Please pick a rating from 1 to 5 stars.');
  });

  it('emits save with the picked rating and the trimmed comment', () => {
    starButtons()[3].click(); // 4 stars
    fixture.detectChanges();
    commentInput().value = '  Deep and dry  ';
    commentInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton().disabled).toBe(false);
    form().requestSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.saved).toEqual([{ rating: 4, comment: 'Deep and dry' }]);
  });

  it('emits a null comment when the comment is blank', () => {
    starButtons()[1].click(); // 2 stars
    fixture.detectChanges();

    form().requestSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.saved).toEqual([{ rating: 2, comment: null }]);
  });

  it('enforces the 500-char comment limit (inline error, save disabled, counter over)', () => {
    starButtons()[0].click(); // 1 star
    fixture.detectChanges();
    commentInput().value = 'x'.repeat(501);
    commentInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton().disabled).toBe(true);
    expect(host().querySelector('.field-counter--over')).not.toBeNull();

    commentInput().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host().textContent).toContain('Comment must be 500 characters or fewer.');

    // Exactly 500 chars is allowed.
    commentInput().value = 'x'.repeat(500);
    commentInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);

    form().requestSubmit();
    fixture.detectChanges();
    expect(fixture.componentInstance.saved).toHaveLength(1);
    expect(fixture.componentInstance.saved[0]?.comment).toHaveLength(500);
  });

  it('edit mode seeds the picker and comment, and offers delete', () => {
    fixture.componentInstance.mode.set('edit');
    fixture.componentInstance.initialRating.set(5);
    fixture.componentInstance.initialComment.set('Great shelter');
    fixture.detectChanges();

    expect(host().textContent).toContain('Update your review');
    const btns = starButtons();
    expect(btns.map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
      'false',
      'true',
    ]);
    expect(commentInput().value).toBe('Great shelter');

    const deleteButton = host().querySelector('button.btn--danger') as HTMLButtonElement;
    expect(deleteButton).not.toBeNull();
    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.deleted).toBe(1);
  });

  it('a long pasted comment does not block a valid save once trimmed under the limit', () => {
    starButtons()[4].click(); // 5 stars
    fixture.detectChanges();
    commentInput().value = 'ok'.padEnd(499, 'a');
    commentInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton().disabled).toBe(false);
    form().requestSubmit();
    fixture.detectChanges();
    expect(fixture.componentInstance.saved).toHaveLength(1);
    expect(fixture.componentInstance.saved[0]?.rating).toBe(5);
  });
});
