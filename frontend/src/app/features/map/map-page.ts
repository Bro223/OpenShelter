import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Public home for signed-out/signed-in users: '/map' (and '/').
 *
 * M2 PLACEHOLDER — the real Leaflet shelter map is built in M4 (04 puml).
 * This route exists now so auth flows have a stable home to return to
 * (login/logout/guest redirects all target '/map').
 */
@Component({
  selector: 'app-map-page',
  imports: [RouterLink],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage {}
