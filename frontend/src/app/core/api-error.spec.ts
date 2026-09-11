import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, toApiError } from './api-error';

function errorResponse(status: number, reason: string, message: string) {
  return {
    timestamp: '2025-09-05T10:00:00Z',
    status,
    error: reason,
    message,
    path: '/boom',
  };
}

describe('ApiError', () => {
  describe('fromHttp', () => {
    it('mirrors a uniform ErrorResponse body field-for-field', () => {
      const err = ApiError.fromHttp(
        409,
        errorResponse(409, 'Conflict', 'email already registered'),
        '/auth/register',
      );
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.error).toBe('Conflict');
      expect(err.message).toBe('email already registered');
      expect(err.path).toBe('/boom');
      expect(err.timestamp).toBe('2025-09-05T10:00:00Z');
      expect(err.isNetworkError).toBe(false);
    });

    it('synthesizes a readable error when the body is not an ErrorResponse', () => {
      const err = ApiError.fromHttp(502, '<html>Bad Gateway</html>', 'http://localhost:8080/proxy');
      expect(err.status).toBe(502);
      expect(err.error).toBe('Bad Gateway');
      expect(err.message).toContain('Bad Gateway');
      expect(err.path).toBe('http://localhost:8080/proxy');
    });

    it('uses the standard reason phrases for 502/503/504 in the synthesized error field', () => {
      expect(ApiError.fromHttp(502, null, '/x').error).toBe('Bad Gateway');
      expect(ApiError.fromHttp(503, null, '/x').error).toBe('Service Unavailable');
      expect(ApiError.fromHttp(504, null, '/x').error).toBe('Gateway Timeout');
      expect(ApiError.fromHttp(599, null, '/x').error).toBe('HTTP 599');
    });

    it('falls back to a generic message for an empty unknown body', () => {
      const err = ApiError.fromHttp(500, null, '/x');
      expect(err.status).toBe(500);
      expect(err.error).toBe('Internal Server Error');
      expect(err.message).toBe('Request failed with status 500');
    });
  });

  describe('fromNetwork', () => {
    it('carries status 0 and marks isNetworkError', () => {
      const err = ApiError.fromNetwork();
      expect(err.status).toBe(0);
      expect(err.error).toBe('Network Error');
      expect(err.path).toBe('');
      expect(err.isNetworkError).toBe(true);
      expect(err.message.length).toBeGreaterThan(0);
    });
  });

  describe('toApiError', () => {
    it('passes an ApiError through untouched', () => {
      const original = ApiError.fromNetwork();
      expect(toApiError(original)).toBe(original);
    });

    it('maps an HTTP 401 HttpErrorResponse to an ApiError', () => {
      const httpError = new HttpErrorResponse({
        error: errorResponse(401, 'Unauthorized', 'authentication required'),
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://localhost:8080/api/me',
      });
      const err = toApiError(httpError);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.message).toBe('authentication required');
    });

    it('maps a transport-level HttpErrorResponse (status 0) to a network ApiError', () => {
      const httpError = new HttpErrorResponse({
        error: new Error('Connection refused'),
        status: 0,
        statusText: 'Unknown Error',
      });
      const err = toApiError(httpError);
      expect(err.isNetworkError).toBe(true);
      expect(err.status).toBe(0);
    });

    it('maps arbitrary thrown values to a network ApiError', () => {
      expect(toApiError(new Error('boom')).isNetworkError).toBe(true);
    });
  });
});
