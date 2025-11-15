package app;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class SessionStore {
    private static final Logger log = LoggerFactory.getLogger(SessionStore.class);

    private final Cache<String, Session> cache;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long ttlSeconds;

    public SessionStore(@Value("${app.session.ttl-seconds:3600}") long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .maximumSize(200_000)
                .build();
    }

    public Session get(String sid) {
        Session s = cache.getIfPresent(sid);
        if (s != null && s.isExpired()) {
            cache.invalidate(sid);
            return null;
        }
        return s;
    }

    public Session create(Map<String, Object> claims) {
        String sid = randomSid();
        Instant now = Instant.now();
        Instant exp = now.plus(Duration.ofSeconds(ttlSeconds));
        Session session = new Session(sid, claims, now, exp);
        cache.put(sid, session);
        log.info("Session created for user {} with sid {}", session.getEmail(), sid);
        return session;
    }

    public void invalidate(String sid) {
        cache.invalidate(sid);
        log.info("Session invalidated: {}", sid);
    }

    private String randomSid() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}