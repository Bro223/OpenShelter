import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth-store';

/**
 * The app frame (01 puml, shared/): brand + nav header on top of the routed
 * page. Session-dependent controls come from AuthStore signals and only
 * render after AuthStore.init() settled (no login/logout flash on reload).
 *
 * Thin shell: logout is delegate-and-navigate, nothing else.
 */
@Component({
  selector: 'app-page-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageShell {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly auth = this.store;

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/map']);
  }
}
