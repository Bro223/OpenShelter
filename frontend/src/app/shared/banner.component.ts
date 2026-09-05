import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BannerSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * One banner to surface ApiError messages / notices (01 puml, shared).
 * Renders nothing while `message` is null/empty. error -> role="alert",
 * everything else -> role="status" (aria-live, no interrupt).
 */
@Component({
  selector: 'app-banner',
  imports: [],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  readonly severity = input<BannerSeverity>('error');
  readonly message = input<string | null>(null);
}
