package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import service.DBConnect;
import users.ARO;
import users.DRO;
import users.User;
import utils.ParamValid;
import utils.AuditUtils;
import utils.SecurityUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;

@RestController
public class StudentController {
    private static final Logger log = LoggerFactory.getLogger(StudentController.class.getName());

    @PostMapping(value = "/API/students", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> createStudent(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Map<String, Object> resp = new HashMap<>();
        Session session = request.getAttribute("session") == null ? null : (Session) request.getAttribute("session");
        if (session == null) {
            response.setStatus(403);
            resp.put("ok", false);
            resp.put("message", "unauthorized");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return resp;
        }
        String role = session.getRole();
        User user;
        switch(role.toLowerCase()) {
            case "aro":
                user = new ARO(session.getUserId());
                break;
            case "dro":
                user = new DRO(session.getUserId());
                break;
            default:
                response.setStatus(403);
                resp.put("ok", false);
                resp.put("message", "unauthorized");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
                return resp;
        }
        //读取数据
        String firstName = body.get("firstName") == null ? null : String.valueOf(body.get("firstName"));
        String lastName = body.get("lastName") == null ? null : String.valueOf(body.get("lastName"));
        String email = body.get("email") == null ? null : String.valueOf(body.get("email"));
        String password = body.get("password") == null ? null : String.valueOf(body.get("password"));
        String phone = body.get("mobile") == null ? null : String.valueOf(body.get("mobile"));
        String gender = body.get("gender") == null ? null : String.valueOf(body.get("gender"));
        String identificationNumber = body.get("identificationNumber") == null ? null : String.valueOf(body.get("identificationNumber"));
        String address = body.get("address") == null ? null : String.valueOf(body.get("address"));
        String enrollmentYearStr = body.get("enrollmentYear") == null ? null : String.valueOf(body.get("enrollmentYear"));
        HashMap<String, String> newUserInfo = new HashMap<>();
        if (!ParamValid.isValidUsername(firstName) || !ParamValid.isValidUsername(lastName) || !ParamValid.isValidEmail(email)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid fields");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid fields"));
            return resp;
        }
        else{
            newUserInfo.put("first_name",firstName);
            newUserInfo.put("last_name",lastName);
            newUserInfo.put("email",email);
        }
        if (!ParamValid.isValidPassword(password)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid password");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid password"));
            return resp;
        }
        else{
            String passhash = SecurityUtils.getPasswdHash(password);
            newUserInfo.put("password_hash",passhash);
        }
        if (!ParamValid.isValidPhone(phone)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid phone");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid phone"));
            return resp;
        }
        else{
            newUserInfo.put("phone",phone);
        }
        if (!ParamValid.isValidAddress(address)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid address");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid address"));
            return resp;
        }
        else{
            newUserInfo.put("address",address);
        }
        if (!ParamValid.isValidGender(gender)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid gender");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid gender"));
            return resp;
        }
        else{
            newUserInfo.put("gender",gender);
        }
        if (!ParamValid.isValidIdentityNum(identificationNumber)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid identification number");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid identification number"));
            return resp;
        }
        else{
            newUserInfo.put("identification_number",identificationNumber);
        }
        if (!ParamValid.isValidEnrollmentYear(enrollmentYearStr)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid enrollment year");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "invalid enrollment year"));
            return resp;
        }
        else{
            newUserInfo.put("enrollment_year",enrollmentYearStr);
        }

        try{
            // 生成student id
            String sid = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

            //邮箱查重
            try (ResultSet rs = DBConnect.dbConnector.executeQuery(
                    "SELECT COUNT(*) AS count FROM students_encrypted WHERE email = ?",
                    new String[]{email})) {
                if (rs.next() && rs.getInt("count") > 0) {
                    response.setStatus(409);
                    resp.put("ok", false);
                    resp.put("message", "email exists");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "email exists"));
                    return resp;
                }
            }

            //身份证查重
            try (ResultSet rs = DBConnect.dbConnector.executeQuery(
                    "SELECT COUNT(*) AS count FROM students_encrypted WHERE identification_number = ?",
                    new String[]{identificationNumber})) {
                if (rs.next() && rs.getInt("count") > 0) {
                    response.setStatus(409);
                    resp.put("ok", false);
                    resp.put("message", "identification exists");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "message", "identification exists"));
                    return resp;
                }
            }

            newUserInfo.put("id", sid);
            User.newUser("student", newUserInfo);
            response.setStatus(201);
            resp.put("ok", true);
            resp.put("id", sid);
            resp.put("message", "student created");
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "userId", sid, "emailMasked", SecurityUtils.maskEmail(email), "message", "student created"));
            return resp;
        } catch (SQLException e) {
            response.setStatus(500);
            resp.put("ok", false);
            resp.put("message", "create failed");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", SecurityUtils.maskEmail(email), "error", "SQL_EXCEPTION"));
            return resp;
        }
    }

    @PutMapping(value = "/API/students", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> modifyStudents(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Map<String, Object> resp = new HashMap<>();
        Session session = request.getAttribute("session") == null ? null : (Session) request.getAttribute("session");
        if (session == null) {
            response.setStatus(403);
            resp.put("ok", false);
            resp.put("message", "unauthorized");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return resp;
        }
        String role = session.getRole();
        User user;
        switch(role.toLowerCase()) {
            case "aro":
                user = new ARO(session.getUserId());
                break;
            case "dro":
                user = new DRO(session.getUserId());
                break;
            default:
                response.setStatus(403);
                resp.put("ok", false);
                resp.put("message", "unauthorized");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
                return resp;
        }
        response.setStatus(501);
        resp.put("ok", false);
        resp.put("message", "NOT_IMPLEMENTED");
        return resp;
    }

    @GetMapping(value = "/API/students", produces = MediaType.APPLICATION_JSON_VALUE)
    public Object queryStudents(@RequestParam(value = "email", required = false) String email, HttpServletRequest request, HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Map<String, Object> resp = new HashMap<>();
        Session session = request.getAttribute("session") == null ? null : (Session) request.getAttribute("session");
        if (session == null) {
            response.setStatus(403);
            resp.put("ok", false);
            resp.put("message", "unauthorized");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return resp;
        }
        String role = session.getRole();
        User user;
        switch(role.toLowerCase()) {
            case "aro":
                user = new ARO(session.getUserId());
                break;
            case "dro":
                user = new DRO(session.getUserId());
                break;
            default:
                response.setStatus(403);
                resp.put("ok", false);
                resp.put("message", "unauthorized");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
                return resp;
        }
        String effectiveEmail = email != null ? email : request.getParameter("email");
        boolean hasEmail = effectiveEmail != null && !effectiveEmail.isBlank();
        if (hasEmail && !ParamValid.isValidEmail(effectiveEmail)) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "invalid email");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "invalid email"));
            return resp;
        }
        String baseSql = "SELECT s.id, s.first_name, s.last_name, s.enrollment_year, " +
                "se.email, se.phone, se.gender, se.identification_number, se.address " +
                "FROM students s JOIN students_encrypted se ON s.id = se.id";
        String sql = hasEmail ? (baseSql + " WHERE se.email = ?") : baseSql;
        String[] params = hasEmail ? new String[]{effectiveEmail} : new String[]{};
        try (ResultSet rs = DBConnect.dbConnector.executeQuery(sql, params)) {
            List<Map<String, Object>> list = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", rs.getString("id"));
                item.put("firstName", rs.getString("first_name"));
                item.put("lastName", rs.getString("last_name"));
                item.put("email", rs.getString("email"));
                String phone = rs.getString("phone");
                if (phone != null) item.put("mobile", phone);
                String g = rs.getString("gender");
                if (g != null) item.put("gender", g);
                String idn = rs.getString("identification_number");
                if (idn != null) item.put("identificationNumber", idn);
                String addr = rs.getString("address");
                if (addr != null) item.put("address", addr);
                item.put("enrollmentYear", rs.getInt("enrollment_year"));
                list.add(item);
            }
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "emailMasked", hasEmail ? SecurityUtils.maskEmail(effectiveEmail) : "", "message", hasEmail ? "query student by email" : "query all students"));
            return list;
        } catch (Exception e) {
            response.setStatus(500);
            resp.put("ok", false);
            resp.put("message", "server error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "server error"));
            return resp;
        }
    }

}
