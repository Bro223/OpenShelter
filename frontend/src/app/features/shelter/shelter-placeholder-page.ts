import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * /shelters/:id — M4 ROUTE STUB (M4 design decision 7). Marker and list-row
 * navigation targets this route end-to-end now; M5 replaces the component
 * with the real ShelterDetailPage (same path, no route change).
 */
@Component({
  selector: 'app-shelter-placeholder-page',
  imports: [RouterLink],
  templateUrl: './shelter-placeholder-page.html',
  styleUrl: './shelter-placeholder-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelterPlaceholderPage {}
