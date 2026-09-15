# Spec Delta: media-library (crisis-guidance)

## ADDED Requirements

### Requirement: Media upload with server-side validation

The backend SHALL provide `POST /admin/media` (multipart, ADMIN-kind
authorization: 401 anonymous, 403 non-admin) for uploading an image into the
media library. The server SHALL store the file under a configurable directory
(`app.media.upload-dir`, default `data/media`) with a **generated,
non-guessable filename** (random, plus the extension implied by the detected
type) — the client-supplied filename SHALL NEVER be used to build a
filesystem path and SHALL be kept as display metadata only. Validation SHALL
reject a file that: exceeds the configured size cap (`app.media.max-bytes`,
answered 413), whose magic bytes are not one of JPEG, PNG or WebP (answered
400 — SVG in particular SHALL be rejected), whose sniffed type contradicts
the declared part content type, or whose dimensions cannot be read. The
stored asset SHALL record its content type, pixel dimensions, byte size,
original filename, uploader and upload time, and SHALL be immutable once
stored. The upload directory SHALL be gitignored, SHALL be created when
missing, and an unusable directory SHALL fail the boot loudly.

#### Scenario: A JPEG uploads and lands in the library

- **WHEN** the admin uploads a JPEG photo
- **THEN** the API answers 201/200 with the asset (generated filename,
  `image/jpeg`, its dimensions and size) and the asset appears in
  `GET /admin/media`

#### Scenario: A text file with an image name is refused

- **WHEN** the admin uploads a plain-text file named `photo.jpg`
- **THEN** the API answers 400 and nothing is written to the upload directory

#### Scenario: SVG is refused

- **WHEN** the admin uploads an `.svg` file (even with a declared image
  content type)
- **THEN** the API answers 400 and no asset row is created

#### Scenario: Oversized upload

- **WHEN** the admin uploads a file larger than the configured size cap
- **THEN** the API answers 413 with a message naming the cap, and no partial
  file is left behind

#### Scenario: Declared type contradicts the bytes

- **WHEN** a PNG is uploaded with a declared `image/jpeg` content type
- **THEN** the API answers 400 and no asset is created

#### Scenario: Anonymous and non-admin uploads

- **WHEN** `POST /admin/media` is called without a JWT, or by a verified
  non-admin
- **THEN** the answer is 401 and 403 respectively, and nothing is written to
  disk

#### Scenario: The upload directory is never committed

- **WHEN** the configured upload directory is checked against the repository
  ignore rules
- **THEN** it is ignored (the default `data/media` sits under the already
  ignored `data/` tree, and the ignore file carries an explicit entry as
  well)

### Requirement: Media serving without traversal

The backend SHALL serve stored assets from the dedicated path
`GET /api/media/{filename}` as a permit-all endpoint (the public guidance
pages show them to anonymous visitors). The handler SHALL accept only names
matching the generated shape (32 hexadecimal characters plus `.jpg`, `.png`
or `.webp`), SHALL resolve them strictly inside the configured upload
directory (any resolved path outside it, and any name carrying path
separators or traversal segments, SHALL answer 404), SHALL set the
`Content-Type` from the STORED type rather than from the request or the
extension, SHALL be safe to cache immutably (generated names are never
reused) and SHALL answer 404 for every unknown name without revealing whether
a file exists elsewhere on disk.

#### Scenario: Serving a stored image

- **WHEN** a visitor requests the filename of a stored PNG
- **THEN** the response carries `Content-Type: image/png` and the image bytes

#### Scenario: Traversal attempt

- **WHEN** a request arrives for `../../etc/passwd`, for a name containing a
  slash, or for an absolute path
- **THEN** the API answers 404 and no file outside the upload directory is
  read or returned

#### Scenario: Unknown name

- **WHEN** a request arrives for a syntactically valid but unstored filename
- **THEN** the API answers 404

#### Scenario: Type comes from the store

- **WHEN** a stored asset's bytes are requested
- **THEN** the `Content-Type` matches the asset's stored content type, not
  the extension in the request

### Requirement: Media library listing

The backend SHALL provide `GET /admin/media` (ADMIN-kind authorization)
returning every asset newest-first with: its serving URL, its stored
filename and original filename, its pixel dimensions, its byte size, its
upload date and the number of guidance posts currently using it as their
hero image. The listing SHALL be complete — assets no post references SHALL
be listed like any other, because the library is the admin's inventory and
uploads are independent of post references.

#### Scenario: Listing the library

- **WHEN** the admin opens the media library
- **THEN** each row shows the thumbnail, the filename, the dimensions, the
  size, the upload date and the reused-by-post count

#### Scenario: An unused asset is still listed

- **WHEN** an asset was uploaded and never referenced by a post
- **THEN** it appears in the listing with a reused-by count of zero

#### Scenario: Anonymous listing attempt

- **WHEN** `GET /admin/media` is called without a JWT
- **THEN** the API answers 401

### Requirement: Asset deletion and the in-use confirm

`DELETE /admin/media/{id}` (ADMIN-kind authorization) SHALL delete the asset
row and its file. Deleting an asset that IS still referenced by one or more
guidance posts SHALL be allowed, but SHALL require an explicit confirmation:
without `confirm=true` the API SHALL answer 409 naming the affected posts
(title and slug) and SHALL delete nothing; with `confirm=true` the asset SHALL
be deleted and, in the same transaction, every referencing post SHALL have
its hero image reference AND its hero alt text cleared. The affected post
SHALL then render with no image element and its public detail SHALL still
answer 200 — no broken image may reach a page, and no post may be deleted,
unpublished or otherwise altered by an asset deletion. An unknown id SHALL
answer 404, and a no-op deletion (already deleted) SHALL NOT destroy a
different asset.

#### Scenario: Deleting an unreferenced asset

- **WHEN** the admin deletes an asset no post uses
- **THEN** the row and the file are gone, without any confirmation step

#### Scenario: In-use deletion is refused without confirm

- **WHEN** the admin deletes an asset that is the hero image of two posts,
  without `confirm=true`
- **THEN** the API answers 409, names both posts, and neither the asset nor
  the posts change

#### Scenario: Confirmed in-use deletion

- **WHEN** the admin repeats the deletion with `confirm=true`
- **THEN** the asset is deleted, both posts keep their title, body and status
  and lose their hero image reference and alt text, and both detail pages
  still answer 200 while rendering no image element

#### Scenario: Deleting an asset leaves the file system tidy

- **WHEN** an asset is deleted
- **THEN** its file is removed from the upload directory and the file is no
  longer served (404 on its URL)

#### Scenario: Non-admin deletion attempt

- **WHEN** a verified non-admin calls `DELETE /admin/media/{id}`
- **THEN** the API answers 403 and nothing is deleted

### Requirement: Media library UI

The admin page SHALL gain a **Media library** tab showing every asset with
its thumbnail, filename, dimensions, size, upload date and reused-by-post
count, an upload control, and a delete action per row. Deleting an asset that
is still referenced by posts SHALL present a confirmation dialog that names
the affected posts (from the server's answer), stating that those posts will
render without an image; an unreferenced asset SHALL be deletable without a
confirmation step. Thumbnails SHALL carry a non-empty alt text (the original
filename), every action SHALL be keyboard-operable with a 48px minimum
target, and the tab SHALL work at a 360px-wide viewport with no horizontal
scrolling.

#### Scenario: Upload from the tab

- **WHEN** the admin selects a valid image and uploads it
- **THEN** the asset appears at the top of the list with its dimensions, size
  and a reused-by count of zero

#### Scenario: The confirm names the affected posts

- **WHEN** the admin deletes an asset used by a post
- **THEN** the dialog names that post and explains that the post will render
  without an image, and cancelling leaves everything unchanged

#### Scenario: Upload failure is reported

- **WHEN** the admin uploads a file the server rejects (wrong type or over
  the size cap)
- **THEN** the tab shows the server's message and the list is unchanged

#### Scenario: Keyboard and 360px

- **WHEN** the tab is operated by keyboard only at a 360px-wide viewport
- **THEN** the upload control and every delete action are reachable and
  activatable, with no horizontal scrolling

### Requirement: Media deletion audit rows

Deleting a media asset SHALL write one row to the existing moderation audit
trail (`GET /admin/audit`) in the SAME transaction as the deletion, with the
acting admin as the actor and a human-readable subject label naming the asset
(its original filename and stored filename). The row SHALL remain readable
after the asset is deleted, and it SHALL NOT be rendered as a deleted account
or a deleted shelter. A refused deletion (409 without confirm) SHALL write no
row.

#### Scenario: Deletion leaves a trace

- **WHEN** the admin deletes an asset and then reads `GET /admin/audit`
- **THEN** the newest row carries the media-delete action, the acting admin
  and a subject label naming the asset

#### Scenario: A refused deletion writes nothing

- **WHEN** the admin calls the in-use delete without `confirm=true` and then
  reads the audit trail
- **THEN** no new audit row appears for that call

### Requirement: Uploads and post references are independent

Uploading an asset SHALL NOT attach it to any post, and attaching, replacing
or clearing a post's hero image SHALL NEVER delete or modify any asset.
Replacing a post's hero image SHALL leave the previously referenced asset
untouched in the library (its reused-by count dropping by one), so a replaced
file can be reused or deleted later by an explicit admin decision.

#### Scenario: Upload first, attach later

- **WHEN** an admin uploads an image and does not use it
- **THEN** the library lists it with a reused-by count of zero and no post
  changes

#### Scenario: Replacing a hero image keeps the old file

- **WHEN** the admin replaces a post's hero image with another asset
- **THEN** the post shows the new image, and the previous asset is still
  listed in the library with a reused-by count one lower than before

#### Scenario: Clearing a hero image keeps the file

- **WHEN** the admin clears a post's hero image
- **THEN** the asset is still listed in the library, unchanged, and nothing
  is deleted from disk
