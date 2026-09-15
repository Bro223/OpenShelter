package ee.sheltermap.app;

import ee.sheltermap.domain.RegisteredUser;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Profile lifecycle: registration and lookups.
 *
 * <p>The password captured at registration is <em>not</em> handled here —
 * profile and credentials are separate aggregates (see auth context,
 * {@code 03-auth.puml}). Registration therefore creates a user with
 * {@code levels = {}}; verification happens afterwards.
 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
    }

    /** Creates a {@link RegisteredUser} with no verification claims and persists it. */
    public RegisteredUser register(String name, String email, String phone) {
        RegisteredUser user = new RegisteredUser(name, email, phone);
        userRepository.save(user);
        return user;
    }

    /**
     * Login lookup (03-auth.puml contract): resolves by email when the contact
     * contains '@', otherwise by phone. {@code null} when no account matches.
     */
    public RegisteredUser findByEmailOrPhone(String contact) {
        if (contact == null || contact.isBlank()) {
            return null;
        }
        return contact.contains("@")
                ? userRepository.findByEmail(contact)
                : userRepository.findByPhone(contact);
    }

    /** Password-reset lookup (03-auth.puml contract); {@code null} if unknown. */
    public RegisteredUser findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /** Duplicate-registration pre-check: {@code null} if the phone is free. */
    public RegisteredUser findByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }
}
