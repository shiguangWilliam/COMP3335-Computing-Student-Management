package http;

import app.Session;
import app.SessionStore;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import service.DBConnect;
import utils.SecurityUtils;
import utils.AuditUtils;
import utils.ParamValid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class AuthController {

    @Autowired
    private SessionStore sessionStore;
    private static final String[] USER_TYPE_STRINGS = {"students", "guardians","staffs"};
    private static final Logger log = LoggerFactory.getLogger(AuthController.class.getName());
    // 登录：创建服务端会话并下发 sid Cookie（HttpOnly, SameSite=Lax）
    @PostMapping(value = "/API/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> login(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {

        String email = body.get("email").toString();
        String password = body.get("password").toString();
        
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        
        Map<String, Object> resp = new HashMap<>();
        //参数格式校验
        if(!ParamValid.isValidEmail(email)){
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid email"));
            resp.put("ok",false);
            resp.put("message","invalid email");
            response.setStatus(400);
            return resp;
        }
        
        Map<String, Object> claims = queryLogIn(email, password, requestId);
        if(claims == null){
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid credentials"));
            resp.put("ok",false);
            resp.put("message","invalid credentials");
            response.setStatus(401);
            return resp;
        }

        Session session = sessionStore.create(claims);

        // 构造 Set-Cookie（不启用 Secure，遵循仅HTTP开发环境；生产建议开启）
        String setCookie = buildSidCookie(session);
        response.addHeader("Set-Cookie", setCookie);

        
        resp.put("ok", true);
        resp.put("message", "login accepted, session created");
        return resp;
    }

    private String buildSidCookie(Session session) {
        long maxAgeSec = Math.max(0, Duration.between(Instant.now(), session.getExpiresAt()).getSeconds());
        // SameSite=Lax: 降低CSRF风险；Path=/ 让所有API可用；HttpOnly防脚本访问
        return String.format("sid=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d", session.getSid(), maxAgeSec);
    }

    private static Map<String, Object> queryLogIn(String email, String password, String requestId) {
        for(String userType : USER_TYPE_STRINGS){
            String saltQuery = "SELECT salt FROM %s_encrypted WHERE email = ?".formatted(userType);
            String[] saltParams = {email};
            String salt;
            try (ResultSet rsSalt = DBConnect.dbConnector.executeQuery(saltQuery, saltParams)) {//根据ID搜索盐，没有跳过
                if (rsSalt.next()) {
                    salt = rsSalt.getString("salt");
                } else {
                    continue; // No matching email in this userType, try next
                }
            } catch (SQLException e) {
                log.error("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "userType", userType, "error", "SQL_EXCEPTION"));
                continue; // On error, skip to next userType
            }
            String sqlEnc = "SELECT COUNT(*) AS count FROM %s_encrypted WHERE email = ? AND password_hash = ?".formatted(userType);
            String passwdHash = SecurityUtils.getPasswdHash(password, salt);
            String[] paramsEnc = {email, passwdHash};
            try(ResultSet rs = DBConnect.dbConnector.executeQuery(sqlEnc, paramsEnc)){
                if(rs.next() && rs.getInt("count") > 0){
                    String sql = "SELECT s.*, se.*  FROM %s s JOIN %s_encrypted se ON s.id = se.id WHERE email = ? AND password_hash = ?".formatted(userType, userType);
                    String[] params = {email, passwdHash};
                    try(ResultSet rsUser = DBConnect.dbConnector.executeQuery(sql, params)){
                        if(rsUser.next()){
                            Map<String, Object> claims = new HashMap<>();
                            String id = rsUser.getString("id");
                            String mail = rsUser.getString("email");
                            String first = rsUser.getString("first_name");
                            String last = rsUser.getString("last_name");
                            String role;
                            if ("staffs".equals(userType)) {
                                role = rsUser.getString("role");
                            } else {
                                role = userType.substring(0, userType.length() - 1);
                            }
                            String name = (first != null ? first : "") + (last != null ? (first != null ? " " : "") + last : "");
                            claims.put("userId", id);
                            claims.put("email", mail);
                            claims.put("role", role);
                            claims.put("name", name);
                            log.info("audit={}", AuditUtils.pack("requestId", requestId, "userId", id, "role", role, "emailMasked", SecurityUtils.maskEmail(mail), "message", "login success"));
                            return claims;
                        } else {
                            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "userType", userType, "message", "no matching record after join"));
                        }
                    } catch(SQLException e){
                        log.error("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "userType", userType, "error", "SQL_EXCEPTION"));
                    }
                } else {
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "userType", userType, "message", "no matching record in encrypted table"));
                }
            } catch(SQLException e){
                log.error("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "userType", userType, "error", "SQL_EXCEPTION"));
            }
        }
        log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid credentials"));
        return null;
    }
}