import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  runInInjectionContext,
  signal,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { ThemeStore } from '../core/theme-store';
import type { AppTheme } from '../core/theme-tokens';
import { TranslatePipe } from '../core/i18n/translate-pipe';
import type { MessageKey } from '../core/i18n/messages';

/**
 * The accessibility dialog (accessibility-dialog): the government-site
 * contrast panel the header's "Accessibility" button opens. Three
 * contrast options — Default / High contrast / Black and yellow — as a
 * real radio group; the choice applies AND persists immediately (the
 * ThemeStore owns the localStorage key + the <html data-theme> seam).
 *
 * Accessibility contract:
 *  - `role="dialog"` + `aria-modal="true"`, labelled by its title and
 *    described by its body;
 *  - on open, focus moves INTO the dialog (the container takes focus so
 *    the screen reader announces the dialog name);
 *  - focus is TRAPPED: Tab / Shift+Tab cycle inside the dialog, so the
 *    keyboard cannot reach the inert page behind the overlay (the
 *    consent-banner's trap, extended);
 *  - Escape closes it (no backdrop click on the dialog itself — the
 *    dimmed page behind is not a control);
 *  - on close, focus RETURNS to the trigger button (#a11y-trigger in
 *    page-shell.html), the way a native dialog does.
 *
 * ViewEncapsulation.None on purpose: the black-and-yellow theme's
 * PAGE-WIDE rules (its link colour + the mandatory link underline, the
 * inverted primary button) ship in this component's stylesheet — the
 * third theme's values live in theme-tokens.ts (the design-tokens audit
 * keeps hex literals out of SCSS), and only var() references reach here.
 * Every class is prefixed .a11y-* so the now-global stylesheet cannot
 * collide with a component-scoped rule.
 */
interface A11yOption {
  value: AppTheme;
  labelKey: MessageKey;
  descKey: MessageKey;
}

@Component({
  selector: 'app-accessibility-dialog',
  imports: [TranslatePipe],
  templateUrl: './accessibility-dialog.component.html',
  styleUrl: './accessibility-dialog.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilityDialog {
  /** The overlay is mounted while open (the shell always renders the
      host; the overlay itself is the @if block). */
  readonly open = signal(false);

  protected readonly themeStore = inject(ThemeStore);

  /** The three options, in the government-panel order. */
  protected readonly options: readonly A11yOption[] = [
    { value: 'default', labelKey: 'a11y.option.default', descKey: 'a11y.option.default.desc' },
    {
      value: 'high-contrast',
      labelKey: 'a11y.option.highContrast',
      descKey: 'a11y.option.highContrast.desc',
    },
    {
      value: 'black-and-yellow',
      labelKey: 'a11y.option.blackYellow',
      descKey: 'a11y.option.blackYellow.desc',
    },
  ];

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly injector = inject(Injector);

  /** The active theme (the template reads the signal through this, so a
      switch re-renders the selected-row state). */
  protected theme(): AppTheme {
    return this.themeStore.theme();
  }

  /** Open from the header trigger: the dialog renders, then focus moves
      in (the container — announcing the dialog name + description).
      afterNextRender needs an injection context, and this method runs
      from an event handler — so it is wrapped in runInInjectionContext. */
  openDialog(): void {
    if (this.open()) {
      return;
    }
    this.open.set(true);
    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        this.dialog()?.nativeElement.focus();
      });
    });
  }

  /** Close (Escape, the Close button, or the backdrop): focus RETURNS to
      the trigger button, the way a native dialog does. */
  close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    const trigger = document.getElementById('a11y-trigger');
    trigger?.focus();
  }

  /** Pick a contrast option: applied AND persisted immediately (the
      dialog stays open so the reader can compare the themes). */
  select(theme: AppTheme): void {
    this.themeStore.set(theme);
  }

  /** Backdrop click (the dimmed page is not a control of the dialog). */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  /** Escape closes (and focus returns); Tab / Shift+Tab stay trapped
      inside the dialog (the consent-banner's focus trap, extended). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // The shell's host listener also closes the mobile menu on Escape —
      // stop it here so the dialog owns the key.
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const host = this.dialog()?.nativeElement;
    if (!host) {
      return;
    }
    const focusables = [
      ...host.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex]:not([tabindex="-1"])'),
    ].filter((el) => !el.hasAttribute('disabled'));
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
