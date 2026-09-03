package ee.sheltermap.domain;

import java.util.Set;

/** Anonymous viewer (Pigeon) — can watch the map, never persisted. */
public class GuestUser extends User {

    @Override
    public UserData getData() {
        return new UserData(null, null, null, null, Set.of());
    }

    @Override
    public boolean canWrite() {
        return false;
    }

    @Override
    public void deleteAccount() {
        // anonymous viewer — nothing to delete
    }
}
