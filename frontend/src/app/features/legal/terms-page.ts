import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Static terms of use (legal-recovery). No backend, no state —
 * plain copy. Mirrors the app's own safety notice (not an official
 * emergency service, 112 first) and the locked trust model (verified user
 * ≠ verified shelter).
 */
@Component({
  selector: 'app-terms-page',
  imports: [RouterLink],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage {}
