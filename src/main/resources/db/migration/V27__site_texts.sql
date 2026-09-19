-- site_texts (accessibility-dialog): the admin-editable popup/header/footer
-- texts. One row per (key, locale) — the KEY is a closed allowlist checked
-- in the service (ee.sheltermap.sitetexts.SiteTextKeys, mirrored by the
-- frontend's core/i18n/site-texts.ts), never free-form: a row that names an
-- undeclared key cannot exist, so an admin can override VALUES but can
-- never invent a new UI string (or smuggle markup — the value is plain
-- text, rendered auto-escaped by the Angular interpolation).
--
-- The shipped i18n catalog (en/et/ru) is the DEFAULT: an absent row means
-- "use the catalog". The two footer source links are LABEL + URL pairs:
-- only the link keys (footer.rescueBoard / footer.ministry) may carry a
-- url, and the CHECK enforces https at the database level (the service
-- enforces the same rule before the write, for the readable 400).
--
-- Locale is closed to the three the site serves. value is capped at the
-- same 500 characters the admin UI enforces; a blank value is refused at
-- the database level (the admin API deletes the row to mean "default").
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE site_texts (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(64) NOT NULL,
    locale VARCHAR(2) NOT NULL,
    value VARCHAR(500) NOT NULL,
    url VARCHAR(2048),
    CHECK (locale IN ('en', 'et', 'ru')),
    CHECK (char_length(value) > 0),
    CHECK (url IS NULL OR url LIKE 'https://%'),
    CONSTRAINT uq_site_texts_key_locale UNIQUE (key, locale)
);

-- The public read loads the whole (tiny) table; the index serves the
-- admin write's (key, locale) upsert pre-check.
CREATE INDEX idx_site_texts_key ON site_texts (key);
