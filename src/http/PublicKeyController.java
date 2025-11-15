package http;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
public class PublicKeyController {

    // 简化：返回占位 RSA 公钥（PEM 字符串）。
    // 为了便于前端联调，这里返回一个固定示例公钥；真实项目应使用持久化密钥对。
    private static final String PUBLIC_KEY_PEM = (
            "-----BEGIN PUBLIC KEY-----\n" +
            // 2048-bit RSA 公钥示例（随便用于联调，不用于生产）
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwbCkKkLw4w5S0lFJtJbJ\n" +
            "8tN0kV7FQe0Kz4oVt0mZr8kM1J5u1G2Y8QkE6k7sQwXQ0B4i8mVv9Dc5Yz0k6I2V\n" +
            "U3vC0p2C1wJ9mWJ+Z1YV0hN4QWw3q3dpC2wJtqI9XrCtO8xWQq5LqUwJ3L0lmv7t\n" +
            "1yHfQJm4bYIs1jvZxk7yF7cYQsmQqfGQe8tF6KkzE4e5nLQZqV8k4z1c8E9pGxkN\n" +
            "k9q3r4G2wVxC0UQyJf3b3J0qS8pZr5vK0k8j1yG4v2XbB2Qq6lZl8HfG0p1qjLw3\n" +
            "bR+qP9yEJtLw0s3zIuC1tVfM7wIDAQAB\n" +
            "-----END PUBLIC KEY-----\n"
    );

    @GetMapping(value = "/API/public-key", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getPublicKey() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("publicKeyPem", PUBLIC_KEY_PEM);
        return resp;
    }
}