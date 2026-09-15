-- Shelters gain created_at — the frontend contract field
-- (ShelterDto.createdAt) declared in the puml/README.
ALTER TABLE shelters ADD COLUMN created_at TIMESTAMPTZ;
UPDATE shelters SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE shelters ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE shelters ALTER COLUMN created_at SET DEFAULT now();
