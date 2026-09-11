package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

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
 * <p>The rule is profile-keyed (S3: the resolved {@link Environment}
 * active set, not the raw property string — exempt only when the ENTIRE
 * set is a subset of {@code dev, test} — M2), and reads the provider
 * values the same way the sender beans do:
 *
 * <ul>
 *   <li>When the ENTIRE active profile set is a subset of exactly
 *       {@code dev} and {@code test} (and non-blank) → no check — the
 *       console senders are the point there.</li>
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

    public DevSenderGuard(Environment env,
                          @Value("${app.mail.provider:}") String mailProvider,
                          @Value("${app.sms.provider:}") String smsProvider) {
        // S3: the resolved active profile set (groups/defaults only
        // materialize in the ENVIRONMENT, not the raw property). M2: exempt
        // only when the WHOLE active set is dev/test — "production,dev"
        // is not a dev deploy.
        boolean devLike = Profiles.isDevTestOnly(env);
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
                        + "profile: active profiles={}.", channels, Arrays.toString(env.getActiveProfiles()));
        throw new IllegalStateException(
                "PRODUCTION REFUSED TO START: dev code sender(s) " + channels
                        + " active with profiles=" + Arrays.toString(env.getActiveProfiles())
                        + ". The dev senders log every code in plaintext — set "
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
