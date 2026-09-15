import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { AuthStore } from './session/auth-store';
import { PageShell } from './shared/page-shell';

/**
 * Root. Renders the PageShell (header + router-outlet) and kicks off the
 * one-time boot init: AuthStore.init() silently refreshes a persisted session
 * before the first guard decides (no login flash on reload).
 */
@Component({
  selector: 'app-root',
  imports: [PageShell],
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
