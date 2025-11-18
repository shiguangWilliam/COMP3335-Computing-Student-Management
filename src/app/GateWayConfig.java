package app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.charset.StandardCharsets;

@Configuration
public class GateWayConfig {
    // 先读取环境变量GATEWAY_SHARED_SECRET,在读取 app.gateway.shared-secret
    @Value("${GATEWAY_SHARED_SECRET:${app.gateway.shared-secret:}}")
    private String gateWayHmacSharedKey;

    @Bean
    public byte[] gateWayHmacSharedKey(){
        if (gateWayHmacSharedKey == null || gateWayHmacSharedKey.isBlank()) {
            throw new IllegalStateException("Missing gateway HMAC shared secret (GATEWAY_SHARED_SECRET or app.gateway.shared-secret)");
        }
        return gateWayHmacSharedKey.getBytes(StandardCharsets.UTF_8);
    }
}
