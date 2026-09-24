import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { toApiError } from './api-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The only class allowed to touch HttpClient. Every failure — HTTP error
 * or network error — is converted into an ApiError (mirroring the backend
 * ErrorResponse) via a single catchError. Consumers (gateways, pages)
 * never see raw HttpErrorResponses.
 *
 * Base URL comes from environment.apiUrl (public config only — never
 * tokens).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  get<T>(path: string): Observable<T> {
    return this.request<T>('GET', path);
  }

  /**
   * A GET with the response HEADERS surfaced alongside the body — the
   * paging-metadata seam: X-Total-Count rides a header, not the body, so
   * the paged and un-paged answers share one response shape. The body
   * parses exactly like {@link get}; the caller reads the selected header
   * by name. The auth interceptor and the central ApiError mapping are
   * unchanged.
   */
  getWithHeaders<T>(path: string): Observable<{ body: T; headers: HttpHeaders }> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    return this.http
      .request<T>('GET', url, { observe: 'response' })
      .pipe(
        map((response: HttpResponse<T>) => ({ body: response.body as T, headers: response.headers })),
        catchError((error: unknown) => throwError(() => toApiError(error))),
      );
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
