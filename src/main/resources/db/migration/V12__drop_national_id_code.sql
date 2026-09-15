-- remove-national-id: stop collecting the national ID code.
--
-- The column was written at registration, editable on the account page,
-- and read by nothing: no validation, no query, no verification channel
-- consumes it (SMART_ID is a stub whose future PKI flow stores no code).
-- Dropping it removes a stored national identity number with no
-- functionality. Existing rows simply lose the value — it is never read.

ALTER TABLE users DROP COLUMN national_id_code;
