import { DatePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { ThemeStore } from '../core/theme-store';
import { I18nService } from '../core/i18n/i18n.service';
import { LOCALES, type Locale } from '../core/i18n/locale';
import { TranslatePipe } from '../core/i18n/translate-pipe';
import { type DataSourceDto } from '../core/models';
import { DataSourceGateway } from '../gateways/data-source-gateway';
import { AuthStore } from '../session/auth-store';

/**
 * The app frame (01 puml, shared/): brand + nav header on top of the routed
 * page. Session-dependent controls come from AuthStore signals and only
 * render after AuthStore.init() settled (no login/logout flash on reload).
 *
 * Thin shell: logout is delegate-and-navigate, nothing else.
 *
 * Mobile (<900px, the --bp-narrow breakpoint): the header collapses to
 * brand + burger; nav + actions render inside one .shell-menu node that
 * becomes the dropdown panel (hidden until opened).
 */
@Component({
  selector: 'app-page-shell',
  imports: [RouterOutlet, RouterLink, DatePipe, UpperCasePipe, TranslatePipe],
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageShell implements OnDestroy {
  private readonly store = inject(AuthStore);
  private readonly themeStore = inject(ThemeStore);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Mobile menu panel open state (only meaningful below 900px; the
      burger is hidden at desktop widths). */
  readonly menuOpen = signal(false);

  /** Data provenance for the footer line (official-dataset-csv):
      publisher + official link + last import. Stays null while loading or
      when the API fails — the line is non-critical and hides itself. */
  readonly dataSource = signal<DataSourceDto | null>(null);

  constructor() {
    // Escape closes the menu: host-level keydown listener (fires wherever
    // in the page focus is), removed in ngOnDestroy.
    this.host.nativeElement.addEventListener('keydown', this.onKeydown);
    // One fire-and-forget fetch per app boot (the shell is never destroyed).
    inject(DataSourceGateway)
      .fetch()
      .then((ds) => this.dataSource.set(ds));
  }

  /** True until the first NavigationEnd: that one is the initial document
      load, where the browser's own focus start — and the skip link —
      must win. */
  private firstNavigation = true;

  /** Any completed navigation closes the open menu and lands focus on the
      routed content (bound to NavigationEnd — on any). Unsubscribed in
      ngOnDestroy. */
  private readonly routerClose = this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) {
      this.menuOpen.set(false);
      this.focusMainOnRouteChange();
    }
  });

  protected readonly auth = this.store;
  protected readonly theme = this.themeStore;
  /** i18n-et-en: the chrome copy + the language switcher. `locale`
      is read in the template, so a switch triggers this component's
      change detection and the `pure: false` `t` pipe re-renders. */
  protected readonly i18n = this.i18nService;
  /** The switcher buttons render from LOCALES (a new language is one
      catalog entry, not a template edit). */
  protected readonly locales: readonly Locale[] = LOCALES;

  /** Language switcher action — persists (I18nService). */
  setLocale(locale: Locale): void {
    this.i18nService.setLocale(locale);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('keydown', this.onKeydown);
    this.routerClose.unsubscribe();
  }

  /** Burger click: open/closes the panel. */
  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Any menu item click closes the panel — bound to the .shell-menu
      container, so every current and future item is covered in one
      place (nav anchors, high-contrast toggle, auth buttons/anchors). */
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.menuOpen.set(false);
    }
  };

  /** A route change replaces the page without a document load, so the
      keyboard/screen-reader user would stay parked on the nav item they
      clicked (or on <body>) while the content below changed. Focus the
      routed container — the skip link's landing target — for every
      navigation after the initial load. An open modal dialog owns the
      keyboard (the consent overlay links to /privacy, so a route change can
      happen with it open): never pull focus out from behind it. */
  private focusMainOnRouteChange(): void {
    if (this.firstNavigation) {
      this.firstNavigation = false;
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[aria-modal="true"]') !== null) {
      return;
    }
    this.host.nativeElement.querySelector<HTMLElement>('#main')?.focus();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/map']);
  }
}
