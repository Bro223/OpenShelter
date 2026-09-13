import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { ThemeStore } from '../core/theme-store';
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
  imports: [RouterOutlet, RouterLink],
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageShell implements OnDestroy {
  private readonly store = inject(AuthStore);
  private readonly themeStore = inject(ThemeStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Mobile menu panel open state (only meaningful below 900px; the
      burger is hidden at desktop widths). */
  readonly menuOpen = signal(false);

  /** Any completed navigation closes the open menu (bound to
      NavigationEnd — close on any). Unsubscribed in ngOnDestroy. */
  private readonly routerClose = this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) {
      this.menuOpen.set(false);
    }
  });

  protected readonly auth = this.store;
  protected readonly theme = this.themeStore;

  constructor() {
    // Escape closes the menu: host-level keydown listener (fires wherever
    // in the page focus is), removed in ngOnDestroy.
    this.host.nativeElement.addEventListener('keydown', this.onKeydown);
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

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/map']);
  }
}
