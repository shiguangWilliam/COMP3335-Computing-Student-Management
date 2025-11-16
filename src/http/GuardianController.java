package http;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import utils.ParamValid;
import utils.AuditUtils;
import utils.SecurityUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
public class GuardianController {
    private static final Logger log = LoggerFactory.getLogger(GuardianController.class.getName());

    @PostMapping(value = "/API/guardians", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> createGuardian(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Map<String, Object> resp = new HashMap<>();
        String firstName = body.get("firstName") == null ? null : String.valueOf(body.get("firstName"));
        String lastName = body.get("lastName") == null ? null : String.valueOf(body.get("lastName"));
        String email = body.get("email") == null ? null : String.valueOf(body.get("email"));
        String password = body.get("password") == null ? null : String.valueOf(body.get("password"));
        String mobile = body.get("mobile") == null ? null : String.valueOf(body.get("mobile"));
        String studentId = body.get("studentId") == null ? null : String.valueOf(body.get("studentId"));
        String relation = body.get("relation") == null ? null : String.valueOf(body.get("relation"));

        if (!ParamValid.isValidUsername(firstName) || !ParamValid.isValidUsername(lastName) || !ParamValid.isValidEmail(email) || !ParamValid.isValidPassword(password)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid fields");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid fields"));
            return resp;
        }
        if (mobile != null && !mobile.isBlank() && !ParamValid.isValidPhone(mobile)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid mobile");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid mobile"));
            return resp;
        }
        if (relation != null && !relation.isBlank() && !Set.of("father", "mother", "other").contains(relation)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid relation");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid relation"));
            return resp;
        }

        try {
            String existsSql = "SELECT COUNT(*) AS count FROM guardians_encrypted WHERE email = ?";
            try (ResultSet rs = DBConnect.dbConnector.executeQuery(existsSql, new String[]{email})) {
                if (rs.next() && rs.getInt("count") > 0) {
                    response.setStatus(409);
                    resp.put("ok", false);
                    resp.put("message", "email exists");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "email exists"));
                    return resp;
                }
            }

            String gid = UUID.randomUUID().toString();
            String hash = SecurityUtils.getPasswdHash(password);

            DBConnect.dbConnector.executeUpdate("INSERT INTO guardians (id, first_name, last_name) VALUES (?, ?, ?)", new String[]{gid, firstName, lastName});
            DBConnect.dbConnector.executeUpdate("INSERT INTO guardians_encrypted (id, email, phone, password_hash) VALUES (?, ?, ?, ?)", new String[]{gid, email, mobile == null ? "" : mobile, hash});

            if (studentId != null && !studentId.isBlank() && relation != null && !relation.isBlank()) {
                DBConnect.dbConnector.executeUpdate("UPDATE students_encrypted SET guardian_id = ?, guardian_relation = ? WHERE id = ?", new String[]{gid, relation, studentId});
            }

            response.setStatus(201);
            resp.put("ok", true);
            resp.put("id", gid);
            resp.put("message", "guardian created");
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "userId", gid, "role", "ARO/DRO", "emailMasked", SecurityUtils.maskEmail(email), "message", "guardian created"));
            return resp;
        } catch (SQLException e) {
            response.setStatus(500);
            resp.put("ok", false);
            resp.put("message", "create failed");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "error", "SQL_EXCEPTION"));
            return resp;
        }
    }
}