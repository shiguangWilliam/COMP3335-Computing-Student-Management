package utils;

import java.util.LinkedHashMap;
import java.util.Map;

public class AuditUtils {
    public static Map<String, Object> pack(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (kv == null) return m;
        for (int i = 0; i + 1 < kv.length; i += 2) {
            String k = String.valueOf(kv[i]);
            Object v = kv[i + 1];
            m.put(k, v);
        }
        return m;
    }
}