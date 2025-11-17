package utils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

public class SecurityUtils {
    /**
     * Generate a random salt (32 bytes = 64 hex characters)
     */
    public static String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        StringBuilder sb = new StringBuilder();
        for (byte b : salt) {
            sb.append(String.format("%02x", b));//byte to hex string
        }
        return sb.toString();
    }

    /**
     * Hash password with salt using SHA3-256
     */
    public static String getPasswdHash(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA3-256");
            String saltedPassword = password + salt;
            byte[] hashBytes = md.digest(saltedPassword.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    /**
     * Legacy method for backward compatibility (no salt)
     * @deprecated Use getPasswdHash(password, salt) instead
     */
    @Deprecated
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
    private static final String[] encryptedAtt = {
            "email", "phone", "password_hash", "salt", "guardian_id", "guardian_relation", "gender",
            "identification_number", "address", "grade", "comments", "descriptions"
    };
    public static boolean isEncrypted(String str){
        for(String att : encryptedAtt){
            if(att.equals(str)){
                return true;
            }
        }
        return false;
    }
    public static String maskEmail(String email){
        int atIndex = email.indexOf("@");
        if(atIndex > 0){
            return email.substring(0, atIndex).replaceAll(".", "*") + email.substring(atIndex);
        }
        else{
            return email;
        }

    }
}
