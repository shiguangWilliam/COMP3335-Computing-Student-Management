package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import users.*;
import utils.AuditUtils;
import utils.SecurityUtils;
import java.util.ArrayList;

import java.sql.SQLException;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import service.DBConnect;
import utils.ParamValid;

@RestController
public class ProfileController {
    private static final Logger log = LoggerFactory.getLogger(ProfileController.class.getName());
    @GetMapping(value = "/API/profile", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> profile(HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            // 正常情况下，SessionFilter已返回401；这里兜底
            Map<String, Object> err = new HashMap<>();
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }
        Map<String, Object> resp = new HashMap<>();
        String role = session.getRole();
        User user;
        switch(role){
            case("student"):
                user = new Student(session.getUserId());break;
                
            case("guardian"):
                user = new Guardian(session.getUserId());break;
            case("ARO"):
                user = new ARO(session.getUserId());break;
            case("DRO"):
                user = new DRO(session.getUserId());break;
            case null, default:
                resp.put("ok",false);
                resp.put("message","invalid role");
                response.setStatus(403);
                response.setContentType("application/json");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "invalid role"));
                return resp;

        }
        //调用Session表中存储的用户信息，构建响应体
        try {
            Map<String,String> info = user.queryInfo();
            resp.putAll(info);
            Set<String> sensitiveRemove = Set.of("identification_number","guardian_id","password_hash");
            Set<String> allowed;
            switch (role) {
                case "student":
                    allowed = Set.of("first_name","last_name","gender","email","phone","address","enrollment_year");
                    break;
                case "guardian":
                    allowed = Set.of("first_name","last_name","email","phone");
                    break;
                case "ARO":
                case "DRO":
                    allowed = Set.of("first_name","last_name","gender","email","phone","address","department","role");
                    break;
                default:
                    allowed = Set.of();
            }
            for (String k : new ArrayList<>(resp.keySet())) {
                if (!"user".equals(k) && (sensitiveRemove.contains(k) || !allowed.contains(k))) {
                    resp.remove(k);
                }
            }
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "profile fetched"));
            return resp;
        }
        catch (SQLException e){
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "error", "SQL_EXCEPTION"));
            resp.put("ok",false);
            resp.put("message","fetch failed");
            response.setStatus(500);
            return resp;
        }
    }

    @PutMapping(value = "/API/profile", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> updateProfile(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        Map<String, Object> resp = new HashMap<>();
        String role = session.getRole();
        User user;
        switch (role) {
            case ("student"):
                user = new Student(session.getUserId());
                break;
            case ("guardian"):
                user = new Guardian(session.getUserId());
                break;
            case ("ARO"):
                user = new ARO(session.getUserId());
                break;
            case ("DRO"):
                user = new DRO(session.getUserId());
                break;
            case null, default:
                resp.put("ok", false);
                resp.put("message", "invalid role");
                response.setStatus(403);
                response.setContentType("application/json");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "invalid role"));
                return resp;
        }

        Set<String> allowed;
        switch (role) {
            case "student":
                allowed = Set.of("first_name", "last_name", "email", "phone", "address");
                break;
            case "guardian":
                allowed = Set.of("first_name", "last_name", "email", "phone");
                break;
            case "ARO":
            case "DRO":
                allowed = Set.of("first_name", "last_name", "email", "phone", "address");
                break;
            default:
                allowed = Set.of();
        }
        Set<String> forbidden = Set.of("id", "role", "enrollment_year","gender","department", "guardian_id", "guardian_relation", "identification_number", "password_hash");

        String password = body.get("password") == null ? null : String.valueOf(body.get("password"));
        if (password == null || password.isBlank()) {
            response.setStatus(401);
            Map<String, Object> err = new HashMap<>();
            err.put("ok", false);
            err.put("message", "password required");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "password required"));
            return err;
        }
        
        String passwdHash = SecurityUtils.getPasswdHash(password);
        try {//先验证是本人
            boolean check = User.checkLogin(session.getUserId(), passwdHash, session.getRole());
            if(!check){
                response.setStatus(401);
                Map<String, Object> err = new HashMap<>();
                err.put("ok", false);
                err.put("message", "Invalid password");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "password incorrect"));
                return err;
            }
        }
        catch(SQLException e){
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "error", "SQL_EXCEPTION"));
            resp.put("ok",false);
            resp.put("message","fetch failed");
            response.setStatus(500);
            return resp;
        } 
       
        //检查更新字段合法性，构造更新map
        HashMap<String, String> update = new HashMap<>();
        for (Map.Entry<String, Object> e : body.entrySet()) {
            String key = e.getKey();
            Object val = e.getValue();
            if (val == null) continue;
            String k = key;
            if ("firstName".equals(k)) {
                k = "first_name";
                if(!ParamValid.isValidUsername((String) val)){
                    response.setStatus(400);
                    resp.put("ok", false);
                    resp.put("message", "no valid fields to update");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                    return resp;
                };
            } 
            else if ("lastName".equals(k)) {
                k = "last_name";
                if(!ParamValid.isValidUsername((String) val)){
                    response.setStatus(400);
                    resp.put("ok", false);
                    resp.put("message", "no valid fields to update");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                    return resp;
                };
            } 
            else if ("mobile".equals(k)) {
                k = "phone";
                if(!ParamValid.isValidPhone((String) val)){
                    response.setStatus(400);
                    resp.put("ok", false);
                    resp.put("message", "no valid fields to update");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                    return resp;
                };
            }
            else if ("email".equals(k)) {
                if(!ParamValid.isValidEmail((String) val)){
                    response.setStatus(400);
                    resp.put("ok", false);
                    resp.put("message", "no valid fields to update");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                    return resp;
                };
            }
            else if ("address".equals(k)) {
                if(!ParamValid.isValidAddress((String) val)){
                    response.setStatus(400);
                    resp.put("ok", false);
                    resp.put("message", "no valid fields to update");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                    return resp;
                };
            }
            if (forbidden.contains(k)) continue;
            if (!allowed.contains(k)) continue;
            String v = String.valueOf(val);
            update.put(k, v);
        }

        if (update.isEmpty()) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "no valid fields to update");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
            return resp;
        }

        try {
            user.updateInfo(update);//执行更新
            resp.put("ok",true);
            resp.put("message","profile updated");
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "profile updated"));
            return resp;
        }
        catch(SQLException e){
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "error", "SQL_EXCEPTION"));
            resp.put("ok",false);
            resp.put("message","update failed");
            response.setStatus(500);
            return resp;
        } 
    }

    @PutMapping(value = "/API/modified_Passowrd", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> modifyPassword(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }
        Map<String, Object> resp = new HashMap<>();
        String role = session.getRole();
        User user;
        switch (role) {
            case ("student"):
                user = new Student(session.getUserId());
                break;
            case ("guardian"):
                user = new Guardian(session.getUserId());
                break;
            case ("ARO"):
                user = new ARO(session.getUserId());
                break;
            case ("DRO"):
                user = new DRO(session.getUserId());
                break;
            case null, default:
                resp.put("ok", false);
                resp.put("message", "invalid role");
                response.setStatus(403);
                response.setContentType("application/json");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "invalid role"));
                return resp;
        }
        
        String oldPassword = body.get("oldPassword") == null ? null : String.valueOf(body.get("oldPassword"));
        String newPassword = body.get("newPassword") == null ? null : String.valueOf(body.get("newPassword"));
        
        if (oldPassword == null || newPassword == null || oldPassword.isBlank() || newPassword.isBlank()) {
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "missing passwords");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "missing passwords"));
            return resp;
        }
        //检验新密码格式
        if(!ParamValid.isValidPassword(newPassword)){
            response.setStatus(400);
            resp.put("ok", false);
            resp.put("message", "no valid fields to update");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
            return resp;
        }
        //检验旧密码是否正确
        String oldPassHash = SecurityUtils.getPasswdHash(oldPassword);
        try{
            boolean result = User.checkLogin(session.getUserId(),oldPassHash,session.getRole());
            if(!result){
                response.setStatus(400);
                resp.put("ok", false);
                resp.put("message", "Password wrong");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "message", "no valid fields to update"));
                return resp;
            }
            String newPassHash = SecurityUtils.getPasswdHash(newPassword);
            Map<String,String> update = new HashMap<>();
            update.put("password",newPassHash);
            
            // user.updateInfo(update);
        }
        catch(SQLException e){
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "userId", session.getUserId(), "role", role, "emailMasked", SecurityUtils.maskEmail(session.getEmail()), "error", "SQL_EXCEPTION"));
            resp.put("ok",false);
            resp.put("message","update failed");
            response.setStatus(500);
            return resp;
        }
        
    }
}