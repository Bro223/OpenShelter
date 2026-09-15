import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { toApiError } from './api-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The only class allowed to touch HttpClient (01-TASK.md §4 dependency rule).
 *
 * Every failure — HTTP error or network error — is converted into an ApiError
 * (mirroring the backend ErrorResponse) via a single catchError. Consumers
 * (gateways, pages) never see raw HttpErrorResponses.
 *
 * Base URL comes from environment.apiUrl (public config only — never tokens).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  get<T>(path: string): Observable<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T = void>(path: string): Observable<T> {
    return this.request<T>('DELETE', path);
  }

  request<T>(method: HttpMethod, path: string, body?: unknown): Observable<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const options = body === undefined ? {} : { body };
    return this.http
      .request<T>(method, url, options)
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
