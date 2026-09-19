import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeStore } from '../core/theme-store';
import { BLACK_AND_YELLOW_TOKENS, clearBlackAndYellowTokens } from '../core/theme-tokens';
import { I18nService } from '../core/i18n/i18n.service';
import { AccessibilityDialog } from './accessibility-dialog.component';

/**
 * The accessibility dialog (accessibility-dialog): the dialog contract
 * (role=dialog + aria-modal, focus IN on open, the focus TRAP, Escape to
 * close, focus RETURN to the trigger) and the three-option behaviour
 * (immediate apply + persistence across a "reload").
 */

/** The host: the header's trigger button (the real id) + the dialog.
    Angular 22 no longer assigns template refs to plain class properties
    — viewChild is the seam (the page-shell's pattern). */
@Component({
  template: `
    <button type="button" id="a11y-trigger">Accessibility</button>
    <app-accessibility-dialog #dialog />
  `,
  imports: [AccessibilityDialog],
})
class Host {
  private readonly dialogRef = viewChild(AccessibilityDialog);
  /** The dialog component instance (set after the first change detection). */
  get dialog(): AccessibilityDialog {
    return this.dialogRef()!;
  }
}

describe('AccessibilityDialog', () => {
  let host: Host;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  function trigger(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '#a11y-trigger',
    )!;
  }

  function dialogSection(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      'section[role="dialog"]',
    );
  }

  /** The focusable controls inside the open dialog, in DOM order. */
  function focusables(): HTMLElement[] {
    const host = dialogSection()!;
    return [
      ...host.querySelectorAll<HTMLElement>(
        'button, input, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.hasAttribute('disabled'));
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    clearBlackAndYellowTokens(document.documentElement);
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    clearBlackAndYellowTokens(document.documentElement);
  });

  /** A reload = fresh injector (fresh ThemeStore) over the same storage. */
  function reloadedStore(): ThemeStore {
    document.documentElement.removeAttribute('data-theme');
    clearBlackAndYellowTokens(document.documentElement);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeStore);
  }

  /* --- the dialog contract ------------------------------------------------ */

  it('opens as role=dialog + aria-modal, labelled by title, described by body', () => {
    host.dialog.openDialog();
    fixture.detectChanges();

    const dialog = dialogSection()!;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('a11y-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('a11y-dialog-body');
    expect(dialog.getAttribute('tabindex')).toBe('-1');
    // The three contrast options, in the government-panel order.
    const radios = dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(3);
    expect([...radios].map((r) => r.value)).toEqual([
      'default',
      'high-contrast',
      'black-and-yellow',
    ]);
  });

  it('moves focus INTO the dialog on open (the container announces the name)', async () => {
    trigger().focus();
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve(); // afterNextRender lands after the microtask

    expect(document.activeElement).toBe(dialogSection());
  });

  it('TRAPS focus: Tab on the last control wraps to the first, Shift+Tab on the first wraps to the last', async () => {
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const controls = focusables();
    expect(controls.length).toBeGreaterThanOrEqual(4); // 3 radios + close
    const first = controls[0];
    const last = controls[controls.length - 1];

    // Tab on the last control wraps to the first (no preventDefault →
    // the browser would leave the dialog; the trap must preventDefault).
    last.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialogSection()!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    // Shift+Tab on the first control wraps to the last.
    first.focus();
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    dialogSection()!.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('Escape closes the dialog and focus RETURNS to the trigger', async () => {
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    dialogSection()!.dispatchEvent(esc);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(dialogSection()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('the Close button closes the dialog and returns focus to the trigger', async () => {
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const close = [...focusables()].find((el) => el instanceof HTMLButtonElement)!;
    close.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogSection()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('a backdrop click (outside the dialog box) closes it; a click on the box does not', async () => {
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();

    const overlay = (fixture.nativeElement as HTMLElement).querySelector('.a11y-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(dialogSection()).toBeNull(); // the backdrop click closes the dialog

    // Re-open: a click landing on the dialog box itself must NOT close it.
    host.dialog.openDialog();
    fixture.detectChanges();
    await fixture.whenStable();
    dialogSection()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(dialogSection()).not.toBeNull(); // a click inside the box must not close it
  });

  /* --- the three options: apply + persist immediately --------------------- */

  it('selecting Black and yellow applies the theme + tokens AND persists the choice', () => {
    const store = TestBed.inject(ThemeStore);
    host.dialog.openDialog();
    fixture.detectChanges();

    const radios = [...dialogSection()!.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    const blackYellow = radios.find((r) => r.value === 'black-and-yellow')!;
    blackYellow.checked = true;
    blackYellow.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(store.theme()).toBe('black-and-yellow');
    expect(document.documentElement.getAttribute('data-theme')).toBe('black-and-yellow');
    expect(
      document.documentElement.style.getPropertyValue('--color-text'),
    ).toBe(BLACK_AND_YELLOW_TOKENS['--color-text']);
    expect(localStorage.getItem('openshelter-theme')).toBe('black-and-yellow');
    // The selected row is border-distinguished (the class flips on the
    // theme signal — the dialog stays open so the reader can compare).
    expect(dialogSection()).not.toBeNull();
    const selected = dialogSection()!.querySelector('.a11y-option--selected');
    expect(selected).not.toBeNull();
  });

  it('the black-and-yellow choice survives a reload (a fresh store adopts it)', () => {
    TestBed.inject(ThemeStore).set('black-and-yellow');
    const reloaded = reloadedStore();
    expect(reloaded.theme()).toBe('black-and-yellow');
    expect(document.documentElement.getAttribute('data-theme')).toBe('black-and-yellow');
    expect(
      document.documentElement.style.getPropertyValue('--color-text'),
    ).toBe(BLACK_AND_YELLOW_TOKENS['--color-text']);
  });

  it('selecting Default clears the attribute, the tokens AND the stored key', () => {
    const store = TestBed.inject(ThemeStore);
    store.set('black-and-yellow');
    host.dialog.openDialog();
    fixture.detectChanges();

    const defaultRadio = [...dialogSection()!.querySelectorAll<HTMLInputElement>('input')].find(
      (r) => r.value === 'default',
    )!;
    defaultRadio.checked = true;
    defaultRadio.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(store.theme()).toBe('default');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--color-text')).toBe('');
    expect(localStorage.getItem('openshelter-theme')).toBeNull();
  });

  it('the popup copy is catalog-driven (the shipped defaults the overlay falls back to)', () => {
    const i18n = TestBed.inject(I18nService);
    host.dialog.openDialog();
    fixture.detectChanges();

    const dialog = dialogSection()!;
    expect(
      dialog.querySelector('.a11y-dialog__title')!.textContent?.trim(),
    ).toBe(i18n.t('a11y.popup.title'));
    expect(
      dialog.querySelector('.a11y-dialog__body')!.textContent?.trim(),
    ).toBe(i18n.t('a11y.popup.body'));
  });
});
