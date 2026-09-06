import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type { ShelterReviewDto } from '../core/models';
import { ReviewGateway } from './review-gateway';

const REVIEW: ShelterReviewDto = {
  id: 11,
  authorName: 'Marek T.',
  rating: 5,
  comment: 'Deep and dry — good spot.',
  createdAt: '2025-09-01T08:00:00Z',
};

const BARE: ShelterReviewDto = { ...REVIEW, id: 12, comment: null };

/** Hand-written fake ApiClient — the gateway must only pick paths/bodies (01-TASK.md §8). */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('ReviewGateway', () => {
  let gateway: ReviewGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(ReviewGateway);
  });

  it('list GETs /api/shelters/{id}/reviews and returns the typed rows', async () => {
    api.get.mockReturnValue(of([REVIEW, BARE]));

    const rows = await gateway.list(7);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/shelters/7/reviews');
    expect(rows).toEqual([REVIEW, BARE]);
  });

  it('list supports an empty result set (no reviews yet)', async () => {
    api.get.mockReturnValue(of([]));

    const rows = await gateway.list(7);

    expect(api.get).toHaveBeenCalledWith('/api/shelters/7/reviews');
    expect(rows).toEqual([]);
  });

  it('add POSTs {rating, comment} to /api/shelters/{id}/reviews', async () => {
    api.post.mockReturnValue(of(REVIEW));

    const saved = await gateway.add(7, 5, 'Deep and dry');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/shelters/7/reviews', { rating: 5, comment: 'Deep and dry' });
    expect(saved).toEqual(REVIEW);
  });

  it('add omits the comment field when the comment is empty', async () => {
    api.post.mockReturnValue(of(BARE));

    const saved = await gateway.add(7, 3, null);

    expect(api.post).toHaveBeenCalledWith('/api/shelters/7/reviews', { rating: 3 });
    expect(saved).toEqual(BARE);
  });

  it('updateMine PUTs the review body to /api/shelters/{id}/reviews/mine', async () => {
    api.put.mockReturnValue(of(REVIEW));

    const saved = await gateway.updateMine(7, 4, 'Updated comment');

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/api/shelters/7/reviews/mine', {
      rating: 4,
      comment: 'Updated comment',
    });
    expect(saved).toEqual(REVIEW);
  });

  it('deleteMine issues DELETE /api/shelters/{id}/reviews/mine and resolves with no body', async () => {
    api.delete.mockReturnValue(of(undefined));

    const result = await gateway.deleteMine(7);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/api/shelters/7/reviews/mine');
    expect(result).toBeUndefined();
  });

  it('list rejects with ApiError when the shelter is missing (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'Shelter not found',
        path: '/api/shelters/999/reviews',
      },
      '/api/shelters/999/reviews',
    );
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.list(999)).rejects.toBe(failure);
  });

  it('add rejects with ApiError when the account is not verified (403)', async () => {
    const failure = ApiError.fromHttp(
      403,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 403,
        error: 'Forbidden',
        message: 'reviews require a verified account',
        path: '/api/shelters/7/reviews',
      },
      '/api/shelters/7/reviews',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.add(7, 5, null)).rejects.toBe(failure);
  });

  it('updateMine rejects with ApiError when the request fails', async () => {
    const failure = ApiError.fromNetwork();
    api.put.mockReturnValue(throwError(() => failure));

    await expect(gateway.updateMine(7, 5, null)).rejects.toBe(failure);
  });

  it('deleteMine rejects with ApiError when the request fails', async () => {
    const failure = ApiError.fromNetwork();
    api.delete.mockReturnValue(throwError(() => failure));

    await expect(gateway.deleteMine(7)).rejects.toBe(failure);
  });
});
