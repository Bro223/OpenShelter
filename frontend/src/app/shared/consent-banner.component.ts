import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentStore } from '../core/consent-store';
import { TranslatePipe } from '../core/i18n/translate-pipe';

/**
 * The first-level data-usage notice (Workstream B), rendered as a centered
 * modal overlay. The app has NO optional cookies, trackers or analytics, so
 * there is no accept/reject split: the single explicit "Got it" button is
 * the only way to dismiss it. There is deliberately no backdrop-click or
 * Escape dismissal - closing is never a silent consent.
 *
 * Accessibility: `role="dialog"` + `aria-modal="true"` with an accessible
 * name and description. On open, focus moves onto the dialog; Tab and
 * Shift+Tab cycle inside the dialog so keyboard users cannot reach the
 * inert page behind the overlay. The native button and link keep the
 * app-wide focus ring and 48px touch target.
 */
@Component({
  selector: 'app-consent-banner',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './consent-banner.component.html',
  styleUrl: './consent-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentBanner {
  protected readonly consent = inject(ConsentStore);

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // The dialog only renders while the decision is outstanding; focus it
    // once it is on screen so the screen reader announces the dialog name.
    afterNextRender(() => {
      this.dialog()?.nativeElement.focus();
    });
  }

  /** Keep Tab / Shift+Tab cycling inside the dialog (focus trap). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const host = this.dialog()?.nativeElement;
    if (!host) {
      return;
    }
    const focusables = [
      ...host.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
    ];
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !host.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !host.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}
