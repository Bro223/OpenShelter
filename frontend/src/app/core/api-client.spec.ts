import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { throwError } from 'rxjs';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { environment } from '../../environments/environment';

describe('ApiClient', () => {
  describe('against the HTTP backend', () => {
    let client: ApiClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      client = TestBed.inject(ApiClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('hits environment.apiUrl + path and delivers the parsed body', () => {
      let body: unknown;
      client.get<{ ok: boolean }>('/api/shelters').subscribe((value) => (body = value));
      const req = httpMock.expectOne(`${environment.apiUrl}/api/shelters`);
      expect(req.request.method).toBe('GET');
      req.flush({ ok: true });
      expect(body).toEqual({ ok: true });
    });

    it.each([
      [400, 'Bad Request'],
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
      [409, 'Conflict'],
      [429, 'Too Many Requests'],
      [500, 'Internal Server Error'],
    ] as const)(
      'maps HTTP %s to an ApiError mirroring the backend ErrorResponse',
      (status, reason) => {
        let error: unknown;
        client.get<void>('/boom').subscribe({ error: (e) => (error = e) });
        const req = httpMock.expectOne(`${environment.apiUrl}/boom`);
        req.flush(
          {
            timestamp: '2025-09-05T10:00:00Z',
            status,
            error: reason,
            message: 'detail',
            path: '/boom',
          },
          { status, statusText: reason },
        );
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(status);
        expect(apiError.error).toBe(reason);
        expect(apiError.message).toBe('detail');
        expect(apiError.path).toBe('/boom');
        expect(apiError.timestamp).toBe('2025-09-05T10:00:00Z');
      },
    );

    it('completes for empty bodies (register 201 / logout 204 semantics)', () => {
      let completed = false;
      client
        .post<void>('/auth/register', { name: 'x' })
        .subscribe({ complete: () => (completed = true) });
      httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush(null, {
        status: 201,
        statusText: 'Created',
      });
      expect(completed).toBe(true);
    });

    it('sends the body on POST and none on DELETE', () => {
      client.post<void>('/auth/login', { emailOrPhone: 'a@b.ee', password: 'x' }).subscribe();
      const postReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(postReq.request.body).toEqual({ emailOrPhone: 'a@b.ee', password: 'x' });
      postReq.flush({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });

      client.delete('/auth/refresh-token').subscribe();
      const deleteReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh-token`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);
    });
  });

  describe('network failures', () => {
    it('maps a transport-level failure to ApiError.fromNetwork (status 0)', () => {
      const fakeHttp = {
        request: () =>
          throwError(
            () =>
              new HttpErrorResponse({
                error: new Error('Connection refused'),
                status: 0,
                statusText: 'Unknown Error',
              }),
          ),
      };
      TestBed.configureTestingModule({
        providers: [{ provide: HttpClient, useValue: fakeHttp as unknown as HttpClient }],
      });
      const client = TestBed.inject(ApiClient);

      let error: unknown;
      client.get<void>('/anywhere').subscribe({ error: (e) => (error = e) });
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.isNetworkError).toBe(true);
      expect(apiError.status).toBe(0);
      expect(apiError.path).toBe('');
    });
  });
});
