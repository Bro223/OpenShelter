package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Startup guard for the DEFAULT dev code senders (2026-09-10 review H3) —
 * <strong>fails closed, same profile rule as {@link ProdJwtGuard} and
 * {@link DevEndpointsGuard}.</strong>
 *
 * <p>{@code DevSmtpSender} and {@code DevSmsSender} are the DEFAULT senders
 * ({@code app.mail.provider} / {@code app.sms.provider} default to
 * {@code dev} via {@code matchIfMissing}) and they log every OTP / reset /
 * contact-change code in PLAINTEXT to the console. A production deploy that
 * forgets the provider envs therefore boots fine and logs every code — an
 * OTP leak with the app still fully "working".
 *
 * <p>The rule is profile-keyed (exempt only when the ENTIRE active profile
 * set is a subset of {@code dev, test} — M2), and reads the provider values
 * the same way the sender beans do:
 *
 * <ul>
 *   <li>When at least one active profile entry is exactly {@code dev} or
 *       {@code test} → no check — the console senders are the point there.</li>
 *   <li>Otherwise (blank profile, {@code production}, {@code prod-*},
 *       anything else) → refuse to boot when the mail provider is blank or
 *       {@code dev} OR the sms provider is blank or {@code dev} — i.e. when
 *       at least one of the two channels would fall back to the dev sender.</li>
 * </ul>
 *
 * <p>A misconfigured deploy is caught at boot, not on the first logged code.
 */
@Component
public class DevSenderGuard {

    private static final Logger log = LoggerFactory.getLogger(DevSenderGuard.class);

    public DevSenderGuard(@Value("${spring.profiles.active:}") String profiles,
                          @Value("${app.mail.provider:}") String mailProvider,
                          @Value("${app.sms.provider:}") String smsProvider) {
        List<String> active = Arrays.stream(profiles.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        // M2: exempt only when the WHOLE active set is dev/test — "production,dev"
        // is not a dev deploy.
        boolean devLike = !active.isEmpty()
                && active.stream().allMatch(p -> p.equals("dev") || p.equals("test"));
        // matchIfMissing parity: blank/missing provider = the dev sender wins.
        boolean mailIsDev = mailProvider == null || mailProvider.isBlank()
                || "dev".equals(mailProvider);
        boolean smsIsDev = smsProvider == null || smsProvider.isBlank()
                || "dev".equals(smsProvider);
        if (devLike || (!mailIsDev && !smsIsDev)) {
            return; // dev/test parity, or both channels are real senders
        }
        String channels = channelsWithDevSenders(mailIsDev, smsIsDev);
        // Loud log + loud rejection — never boot a non-dev/test profile with
        // a console sender that will log every code in plaintext.
        log.error("REFUSING TO START — dev code sender(s) {} active on a non-dev/test "
                        + "profile: active profiles=[{}].", channels, profiles);
        throw new IllegalStateException(
                "PRODUCTION REFUSED TO START: dev code sender(s) " + channels
                        + " active with profiles=[" + profiles
                        + "]. The dev senders log every code in plaintext — set "
                        + "MAIL_PROVIDER=smtp-pulse / SMS_PROVIDER=twilio for real "
                        + "channels, or run with SPRING_PROFILES_ACTIVE=dev/test for local "
                        + "development.");
    }

    private static String channelsWithDevSenders(boolean mailIsDev, boolean smsIsDev) {
        if (mailIsDev && smsIsDev) {
            return "app.mail.provider + app.sms.provider";
        }
        return mailIsDev ? "app.mail.provider" : "app.sms.provider";
    }
}
