package ee.sheltermap.domain;

import java.util.Set;

/**
 * Staff account (Parrot), full write rights.
 *
 * <p>Minimal role — deliberately NO moderation methods: there is no moderator
 * in the system. Shelter quality is governed by community ratings
 * ({@link ShelterReview}) instead.
 */
public class AdminUser extends User {

    @Override
    public UserData getData() {
        return new UserData(null, null, null, null, Set.of());
    }

    @Override
    public boolean canWrite() {
        return true;
    }

    @Override
    public void deleteAccount() {
        // no domain state owned by an admin in v1
    }
}
