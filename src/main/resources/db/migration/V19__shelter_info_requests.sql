-- Shelter Map — V19 (moderation-dashboard-completion).
-- The moderator→submitter information request: ONE row per shelter, kept
-- after the reply (audit posture — a replied request is never deleted).
-- The submitter sees the pending request on their own row (/mine) and
-- answers ONCE; the admin sees the request together with the reply on the
-- admin shelter list.
--
-- shelter_id: ON DELETE CASCADE (the V1 child-table convention — the
-- exchange is about THIS shelter; when the shelter is hard-deleted the
-- row goes with it, like its reviews and reports). Unlike
-- shelter_history (V18) there is no dangling-read surface for a deleted
-- shelter, so the FK stays referential.
--
-- requested_by / replied_by: ON DELETE SET NULL (the V14
-- moderation_actions convention) — an account erasure must not erase the
-- exchange; the ids dangle and render "Unknown" at read time.
--
-- UNIQUE (shelter_id): one exchange per shelter. After a reply the row is
-- KEPT, so a second request for the same shelter is a 409 — the single
-- exchange is the contract (the spec delta: the submitter answers ONCE).
--
-- Message bounds: 2000 chars each side (the description's column bound —
-- one spelling of the free-text bound).
--
-- ddl-auto=validate must stay green against these definitions.
CREATE TABLE shelter_info_requests (
    id BIGSERIAL PRIMARY KEY,
    shelter_id BIGINT NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    message VARCHAR(2000) NOT NULL,
    requested_by BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reply_message VARCHAR(2000) NULL,
    replied_by BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
    replied_at TIMESTAMPTZ NULL,
    UNIQUE (shelter_id)
);
