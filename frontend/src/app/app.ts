import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { AuthStore } from './session/auth-store';
import { ConsentBanner } from './shared/consent-banner.component';
import { PageShell } from './shared/page-shell';

/**
 * Root. Renders the PageShell (header + router-outlet) and the consent
 * banner as its siblings, and kicks off the one-time boot init:
 * AuthStore.init() silently refreshes a persisted session before the first
 * guard decides (no login flash on reload). The banner sits at the root
 * (a modal belongs at the root) so no shell ancestor can box or clip its
 * fixed overlay.
 */
@Component({
  selector: 'app-root',
  imports: [PageShell, ConsentBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly auth = inject(AuthStore);

  ngOnInit(): void {
    void this.auth.init();
  }
}
