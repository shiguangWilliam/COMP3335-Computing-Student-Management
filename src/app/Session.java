package app;

import java.time.Instant;
import java.util.Map;

public class Session {
    private final String sid;
    private final String userId;
    private final String email;
    private final String role;
    private final String name;
    private final Instant createdAt;
    private final Instant expiresAt;

    public Session(String sid, Map<String, Object> claims, Instant createdAt, Instant expiresAt) {
        this.sid = sid;
        this.userId = stringClaim(claims, "userId");
        this.email = stringClaim(claims, "email");
        this.role = stringClaim(claims, "role");
        this.name = stringClaim(claims, "name");
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    private String stringClaim(Map<String, Object> claims, String key) {
        Object v = claims.get(key);
        return v == null ? null : String.valueOf(v);
    }

    public String getSid() { return sid; }
    public String getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getName() { return name; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}