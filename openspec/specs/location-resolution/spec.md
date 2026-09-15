# location-resolution Specification

## Purpose

Backend resolution of `maps.app.goo.gl` short links into coordinates for the shelter
submission form: a JWT-protected, per-IP rate-limited endpoint that follows a bounded
redirect walk (auto-follow off, every hop re-validated) and extracts the pair with the
app's shared Estonia-bbox gate and (lng,lat) auto-swap rules.

## Requirements

### Requirement: The backend SHALL expose POST /api/geo/resolve

A JWT-protected `POST /api/geo/resolve` endpoint SHALL accept
`{"url": string}`, rate-limit per client IP to 5 requests per minute,
and return `{"latitude": number, "longitude": number}` on success.

#### Scenario: Successful resolution

- **WHEN** an authenticated caller posts a `maps.app.goo.gl` URL whose
  redirect chain ends at a URL containing an in-Estonia pair
- **THEN** the response is 200 with `latitude` and `longitude`

#### Scenario: Rate limit exceeded

- **WHEN** a client IP exceeds 5 requests within a minute
- **THEN** the response is 429

#### Scenario: Unauthenticated

- **WHEN** the request has no valid JWT
- **THEN** the response is 401
