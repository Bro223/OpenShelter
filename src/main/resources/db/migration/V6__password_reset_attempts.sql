-- Password reset moves from 32-char URL tokens to 6-digit e-mailed codes
-- (password-reset-email-code). A 6-digit code is guessable, unlike the old
-- 32-char token, so each pending code carries a brute-force attempt counter
-- (5 failed attempts lock the code out; a new request replaces it).
ALTER TABLE password_reset_tokens ADD COLUMN attempts INT NOT NULL DEFAULT 0;
