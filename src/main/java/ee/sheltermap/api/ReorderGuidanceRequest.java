package ee.sheltermap.api;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * {@code PUT /admin/guidance/order} body (guidance-manual-order D3).
 *
 * <p>{@code postIds} is the FULL ordered list of post ids — drafts and
 * published alike. The service re-checks everything (it is the
 * authority, the annotation is the early 400 for an absent field): the
 * list must be a PERMUTATION of every current post id — an unknown id,
 * a duplicate id, or a current post missing from the list is a 400 in
 * the uniform error body that changes nothing; a valid reorder renumbers
 * 1..N in ONE transaction and answers 204.
 */
public record ReorderGuidanceRequest(@NotNull List<Long> postIds) {
}
