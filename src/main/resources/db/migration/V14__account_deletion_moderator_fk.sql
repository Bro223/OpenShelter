-- legal-recovery M4 slice 2: the account-erasure path (DELETE /account)
-- must be able to remove a user who is an actor of record in the
-- moderation audit trail — AUTO_CONFIRM rows name the REPORTING user, not
-- an admin. The audit row survives the erasure with the moderator
-- reference dangling (the admin read renders "Unknown" — the same
-- convention as the FK-less shelter_id), so the column becomes nullable
-- and the FK is relaxed to ON DELETE SET NULL. Every other user_id FK is
-- already ON DELETE CASCADE (or SET NULL on shelters.created_by).
ALTER TABLE moderation_actions ALTER COLUMN moderator_id DROP NOT NULL;
ALTER TABLE moderation_actions DROP CONSTRAINT moderation_actions_moderator_id_fkey;
ALTER TABLE moderation_actions
    ADD CONSTRAINT fk_moderation_actions_moderator
    FOREIGN KEY (moderator_id) REFERENCES users (id) ON DELETE SET NULL;
