package utils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class SecurityUtils {
    public static String getPasswdHash(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA3-256");
            byte[] hashBytes = md.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }
}
