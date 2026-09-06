import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { ReviewRequest, ShelterReviewDto } from '../core/models';

/**
 * The door to the /api/shelters/{id}/reviews controller group (01 puml: one
 * gateway per backend controller group). The four methods mirror the four
 * endpoints 1:1 (06-CONTEXT-SHELTER.md):
 *
 *   GET    /api/shelters/{id}/reviews      -> ShelterReviewDto[] (public)
 *   POST   /api/shelters/{id}/reviews      -> ShelterReviewDto (verified;
 *                                             201 new / 200 updated — the
 *                                             backend upserts)
 *   PUT    /api/shelters/{id}/reviews/mine -> ShelterReviewDto (verified,
 *                                             author-only)
 *   DELETE /api/shelters/{id}/reviews/mine -> 204 (verified, author-only)
 *
 * All methods return typed promises and throw ApiError on failure (mapped
 * centrally by ApiClient). `comment` null/empty means "no comment" — the
 * request body omits the field, matching the backend's optional `@Size(max
 * = 500) String comment`.
 */
@Injectable({ providedIn: 'root' })
export class ReviewGateway {
  private readonly api = inject(ApiClient);

  /** GET /api/shelters/{id}/reviews -> the shelter's reviews (public read). */
  list(shelterId: number): Promise<ShelterReviewDto[]> {
    return lastValueFrom(this.api.get<ShelterReviewDto[]>(`/api/shelters/${shelterId}/reviews`));
  }

  /**
   * POST /api/shelters/{id}/reviews -> the saved review. The backend
   * upserts: one review per user per shelter (201 on first, 200 on update).
   */
  add(shelterId: number, rating: number, comment: string | null): Promise<ShelterReviewDto> {
    return lastValueFrom(
      this.api.post<ShelterReviewDto>(`/api/shelters/${shelterId}/reviews`, reviewBody(rating, comment)),
    );
  }

  /** PUT /api/shelters/{id}/reviews/mine -> the updated own review (404 if absent). */
  updateMine(
    shelterId: number,
    rating: number,
    comment: string | null,
  ): Promise<ShelterReviewDto> {
    return lastValueFrom(
      this.api.put<ShelterReviewDto>(`/api/shelters/${shelterId}/reviews/mine`, reviewBody(rating, comment)),
    );
  }

  /** DELETE /api/shelters/{id}/reviews/mine -> 204 No Content (author-only). */
  deleteMine(shelterId: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/api/shelters/${shelterId}/reviews/mine`));
  }
}

/** The uniform review body — the comment field is omitted when empty. */
function reviewBody(rating: number, comment: string | null): ReviewRequest {
  const body: ReviewRequest = { rating };
  if (comment !== null) {
    body.comment = comment;
  }
  return body;
}
