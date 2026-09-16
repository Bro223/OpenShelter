-- Hardening pass: shelters gain created_at. The frontend contract field
-- (ShelterDto.createdAt) was declared in the puml/README but never captured
-- in the model or schema — the API always returned null.
ALTER TABLE shelters ADD COLUMN created_at TIMESTAMPTZ;
UPDATE shelters SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE shelters ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE shelters ALTER COLUMN created_at SET DEFAULT now();
