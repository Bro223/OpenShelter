import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Static privacy policy (M4 legal-recovery slice 3). No backend, no state —
 * the page is plain copy + router links to the account and terms pages. The
 * copy states the app's ACTUAL behavior (encryption at rest, client-side
 * geolocation, self-service export/deletion); retention has no calendar
 * schedule yet — the owner product call is logged, not asserted here.
 */
@Component({
  selector: 'app-privacy-policy-page',
  imports: [RouterLink],
  templateUrl: './privacy-policy-page.html',
  styleUrl: './privacy-policy-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPage {}
