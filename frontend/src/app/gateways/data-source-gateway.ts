import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { DataSourceDto } from '../core/models';

/**
 * The door to GET /api/data-source (official-dataset-csv) — the
 * app-wide provenance line in the footer. Non-critical: any failure
 * resolves to null and the footer line simply stays hidden.
 */
@Injectable({ providedIn: 'root' })
export class DataSourceGateway {
  private readonly api = inject(ApiClient);

  async fetch(): Promise<DataSourceDto | null> {
    try {
      return await lastValueFrom(this.api.get<DataSourceDto>('/api/data-source'));
    } catch {
      return null;
    }
  }
}
