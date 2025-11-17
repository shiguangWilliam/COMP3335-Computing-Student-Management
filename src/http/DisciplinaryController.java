package http;

import app.Session;
import ch.qos.logback.core.joran.sanity.Pair;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import tables.Disciplinary;
import tables.Grades;
import users.ARO;
import users.DRO;
import users.User;
import utils.AuditUtils;
import utils.ParamValid;
import java.util.ArrayList;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
public class DisciplinaryController {
    private Logger log = LoggerFactory.getLogger(DisciplinaryController.class);

    @GetMapping(value = "/API/disciplinary-records", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getDiscinaryRecord(@RequestParam("studentId") String studentId, @RequestParam("date") String date, HttpServletRequest request , HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        //定义返回map
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> resp = new HashMap<>();
        if (session == null) {
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        User user = new DRO(session.getUserId());
        String staffId = session.getUserId();
        if(studentId == null || studentId.isBlank() || date == null || date.isBlank()){
            err.put("error", "bad request");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request", "userID", session.getUserId()));
            return err;
        }

        try{
            ArrayList<HashMap<String, String>> disciplinaryRecords = Disciplinary.getStudentDisciplinary(studentId, date, staffId);
            if(disciplinaryRecords.isEmpty()){
                err.put("error", "not found");
                err.put("code", 404);
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "not found", "userID", session.getUserId(), "studentID", studentId));
                return err;
            }else{
                Map<String, Object> data = new HashMap<>();
                resp.put("data", disciplinaryRecords);
                resp.put("ok", true);
                log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "disciplinary records retrieved", "userID", session.getUserId(), "studentID", studentId));
                return resp;
            }
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "studentID", studentId, "error", e.getMessage()));
            return err;
        }


    }

    @PostMapping(value = "/API/disciplinary-records", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> addDisciplinaryRecord(@RequestBody Map<String, String> body, HttpServletRequest request , HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        //定义返回map
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> resp = new HashMap<>();
        if (session == null) {
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        DRO user = new DRO(session.getUserId());

        String staffId = session.getUserId();
        String studentId = body.get("studentId");
        String date = body.get("date");
        String description = body.get("description");
        //参数校验
        if(studentId == null || studentId.isBlank() || date == null || date.isBlank() || description == null || description.isBlank()){
            err.put("error", "bad request");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidDate(date) == false){
            err.put("error", "bad request - invalid date format");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid date format", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidString(description) == false){
            err.put("error", "bad request - invalid descriptions format");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid descriptions format", "userID", session.getUserId()));
            return err;
        }

        try{
            String gid = UUID.randomUUID().toString();
            gid.replace("-","");
            user.addDisciplinary(gid, studentId, date, staffId, description);
            resp.put("ok", true);
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "disciplinary record added", "userID", session.getUserId(), "studentID", studentId));
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "studentID", studentId, "error", e.getMessage()));
            return err;
        }
    }

    @PutMapping(value = "/API/disciplinary-records", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> updateDisciplinaryRecord(@RequestBody Map<String, String> body, HttpServletRequest request , HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        //定义返回map
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> resp = new HashMap<>();
        if (session == null) {
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        DRO user = new DRO(session.getUserId());
        
        String dicId = body.get("id");
        String date = body.get("date");
        String descriptions = body.get("description");
        //参数校验
        if(dicId == null || dicId.isBlank()){
            err.put("error", "bad request");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidDate(date) == false){
            err.put("error", "bad request - invalid date format");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid date format", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidString(descriptions) == false){
            err.put("error", "bad request - invalid descriptions format");
            err.put("code", 400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid descriptions format", "userID", session.getUserId()));
            return err;
        }

        try{
            HashMap<String, String> updateMap = new HashMap<>();
            updateMap.put("date", date);
            updateMap.put("descriptions", descriptions);
            
            user.updateDisciplinary(dicId, updateMap);
            resp.put("ok", true);
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "dicID", dicId, "error", e.getMessage()));
            return err;
        }
    }

    @DeleteMapping(value = "/API/disciplinary-records", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> deleteDisciplinaryRecord(@RequestParam("id") String dicId, HttpServletRequest request , HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        //定义返回map
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> resp = new HashMap<>();
        if (session == null) {
            err.put("error", "unauthorized");
            err.put("code", 401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        DRO user = new DRO(session.getUserId());

        try{
            user.deleteDisciplinary(dicId);
            resp.put("ok", true);
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "dicID", dicId, "error", e.getMessage()));
            return err;
        }
    }


        





}
