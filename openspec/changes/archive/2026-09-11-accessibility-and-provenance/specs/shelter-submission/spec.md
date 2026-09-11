# Spec Delta: shelter-submission (accessibility-and-provenance)

## ADDED Requirements

### Requirement: Shelter provenance display

ShelterDto SHALL expose `submitterVerified` — true when the shelter's
creator exists and has a completed verification, false otherwise (registry
shelters are false). List rows and the detail page SHALL display the
provenance plainly: "Paasteamet registry", "Municipal registry",
"Verified user", or "User-submitted".

#### Scenario: verified user shelter

- **WHEN** a shelter was submitted by a user with completed verification
- **THEN** its row and detail page show "Verified user"

#### Scenario: registry shelter

- **WHEN** a shelter came from the Paasteamet registry
- **THEN** its row and detail page show "Paasteamet registry"
