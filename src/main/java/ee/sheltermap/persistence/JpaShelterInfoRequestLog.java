package ee.sheltermap.persistence;

import ee.sheltermap.app.DuplicateInfoRequestException;
import ee.sheltermap.app.InfoRequestAlreadyAnsweredException;
import ee.sheltermap.app.InfoRequestNotFoundException;
import ee.sheltermap.app.ShelterInfoRequestLog;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterInfoRequestLog} (moderation-dashboard-
 * completion M10 slice 3). Write methods carry their own
 * {@code @Transactional} (REQUIRED): the admin write joins the caller's
 * transaction (the service's), the author reply — issued from the
 * controller, which has none — runs find + save in its own, so the
 * answered-check and the stamp are one unit.
 */
@Repository
public class JpaShelterInfoRequestLog implements ShelterInfoRequestLog {

    private final SpringDataShelterInfoRequestRepository repository;
    private final Clock clock;

    public JpaShelterInfoRequestLog(SpringDataShelterInfoRequestRepository repository, Clock clock) {
        this.repository = Objects.requireNonNull(repository, "repository");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    @Transactional
    public InfoRequest request(long shelterId, String message, Long requestedBy) {
        if (repository.findByShelterId(shelterId).isPresent()) {
            throw new DuplicateInfoRequestException();
        }
        ShelterInfoRequestEntity entity = new ShelterInfoRequestEntity();
        entity.setShelterId(shelterId);
        entity.setMessage(message);
        entity.setRequestedBy(requestedBy);
        entity.setRequestedAt(clock.instant());
        try {
            return toRecord(repository.save(entity));
        } catch (DataIntegrityViolationException ex) {
            // A concurrent request won the UNIQUE (shelter_id) bound — the
            // pre-check above is the common path, this is the race backstop.
            throw new DuplicateInfoRequestException();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InfoRequest> findByShelterId(long shelterId) {
        return repository.findByShelterId(shelterId).map(JpaShelterInfoRequestLog::toRecord);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, InfoRequest> findByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, InfoRequest> result = new HashMap<>();
        for (ShelterInfoRequestEntity entity : repository.findByShelterIdIn(shelterIds)) {
            result.put(entity.getShelterId(), toRecord(entity));
        }
        return result;
    }

    @Override
    @Transactional
    public InfoRequest reply(long shelterId, String replyMessage, Long repliedBy) {
        ShelterInfoRequestEntity entity = repository.findByShelterId(shelterId)
                .orElseThrow(InfoRequestNotFoundException::new);
        if (entity.getRepliedAt() != null) {
            throw new InfoRequestAlreadyAnsweredException();
        }
        entity.setReplyMessage(replyMessage);
        entity.setRepliedBy(repliedBy);
        entity.setRepliedAt(clock.instant());
        return toRecord(repository.save(entity));
    }

    private static InfoRequest toRecord(ShelterInfoRequestEntity entity) {
        return new InfoRequest(entity.getId(), entity.getShelterId(), entity.getMessage(),
                entity.getRequestedBy(), entity.getRequestedAt(), entity.getReplyMessage(),
                entity.getRepliedBy(), entity.getRepliedAt());
    }
}
