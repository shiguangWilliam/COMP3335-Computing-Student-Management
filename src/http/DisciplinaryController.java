package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tables.Disciplinary;
import users.DRO;
import utils.AuditUtils;
import utils.ParamValid;
import service.DBConnect;

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
    public Map<String, Object> getDiscinaryRecord(
            @RequestParam(value = "studentId", required = false) String studentId,
            @RequestParam(value = "date", required = false) String date,
            HttpServletRequest request, HttpServletResponse response){
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
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            response.setStatus(403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        String staffId = session.getUserId();

        String studentFilter = (studentId != null && !studentId.isBlank()) ? studentId.trim() : null;
        String dateFilter = (date != null && !date.isBlank()) ? date.trim() : null;
        if (dateFilter != null && !ParamValid.isValidDate(dateFilter)) {
            err.put("error", "bad request - invalid date format");
            err.put("code", 400);
            response.setStatus(400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid date format", "userID", session.getUserId()));
            return err;
        }

        try{
            ArrayList<HashMap<String, String>> disciplinaryRecords = Disciplinary.getStudentDisciplinary(studentFilter, dateFilter, staffId);
            resp.put("data", disciplinaryRecords);
            resp.put("ok", true);
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "disciplinary records retrieved",
                    "userID", session.getUserId(), "studentID", studentFilter == null ? "ALL" : studentFilter,
                    "date", dateFilter == null ? "ALL" : dateFilter));
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            response.setStatus(500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "error", e.getMessage()));
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
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            response.setStatus(403);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "forbidden", "userID", session.getUserId()));
            return err;
        }
        DRO user = new DRO(session.getUserId());

        String staffId = session.getUserId().trim();
        String studentId = body.get("studentId").trim();
        String date = body.get("date").trim();
        String description = body.get("description");
        //参数校验
        if(studentId == null || studentId.isBlank() || date == null || date.isBlank() || description == null || description.isBlank()){
            err.put("error", "bad request");
            err.put("code", 400);
            response.setStatus(400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidDate(date) == false){
            err.put("error", "bad request - invalid date format");
            err.put("code", 400);
            response.setStatus(400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid date format", "userID", session.getUserId()));
            return err;
        }
        if(ParamValid.isValidString(description) == false){
            err.put("error", "bad request - invalid descriptions format");
            err.put("code", 400);
            response.setStatus(400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid descriptions format", "userID", session.getUserId()));
            return err;
        }

        //确保学生存在
        try (ResultSet studentRs = DBConnect.dbConnector.executeQuery("SELECT COUNT(*) AS count FROM students WHERE id = ?", new String[]{studentId})) {
            if (studentRs.next() && studentRs.getInt("count") == 0) {
                err.put("error", "invalid student");
                err.put("code", 400);
                response.setStatus(400);
                err.put("message", "invalid student id");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "invalid student id", "userID", session.getUserId(), "studentID", studentId));
                return err;
            }
        } catch (SQLException e) {
            err.put("error", "internal server error");
            err.put("code", 500);
            response.setStatus(500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "student check failed", "userID", session.getUserId(), "error", e.getMessage()));
            return err;
        }

        try{
            String gid = UUID.randomUUID().toString().replace("-", "");
            if (gid.length() > 20) {
                gid = gid.substring(0, 20);
            }
            user.addDisciplinary(gid, studentId, date, staffId, description);
            resp.put("ok", true);
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "disciplinary record added", "userID", session.getUserId(), "studentID", studentId));
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            response.setStatus(500);
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
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            response.setStatus(403);
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
            response.setStatus(400);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request", "userID", session.getUserId()));
            return err;
        }
        HashMap<String, String> updateMap = new HashMap<>();
        if(date != null && !date.isBlank()){
            if(ParamValid.isValidDate(date) == false){
                err.put("error", "bad request - invalid date format");
                err.put("code", 400);
                response.setStatus(400);
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid date format", "userID", session.getUserId()));
                return err;
            }
            updateMap.put("date", date);
        }
        if(descriptions != null && !descriptions.isBlank()){
            if(ParamValid.isValidString(descriptions) == false){
                err.put("error", "bad request - invalid descriptions format");
                err.put("code", 400);
                response.setStatus(400);
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "bad request - invalid descriptions format", "userID", session.getUserId()));
                return err;
            }
            updateMap.put("descriptions", descriptions);
        }
        if(updateMap.isEmpty()){
            err.put("error", "bad request");
            err.put("code", 400);
            response.setStatus(400);
            err.put("message", "no valid fields to update");
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "no valid fields to update", "userID", session.getUserId()));
            return err;
        }

        //确保学生存在
        try(ResultSet rs = DBConnect.dbConnector.executeQuery("SELECT COUNT(*) AS count FROM disciplinary_records WHERE id = ?", new String[]{dicId})){
            if(rs.next() && rs.getInt("count")==0){
                err.put("error", "not found");
                err.put("code", 404);
                response.setStatus(404);
                err.put("message", "record not found");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "record not found", "userID", session.getUserId(), "dicID", dicId));
                return err;
            }
        } catch (SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            response.setStatus(500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "dicID", dicId, "error", e.getMessage()));
            return err;
        }

        try{
            user.updateDisciplinary(dicId, updateMap);
            resp.put("ok", true);
            return resp;
        }
        catch(SQLException e){
            err.put("error", "internal server error");
            err.put("code", 500);
            response.setStatus(500);
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
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }

        String role = session.getRole();
        if(!"DRO".equalsIgnoreCase(role)){
            err.put("error", "forbidden");
            err.put("code", 403);
            response.setStatus(403);
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
            response.setStatus(500);
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "internal server error", "userID", session.getUserId(), "dicID", dicId, "error", e.getMessage()));
            return err;
        }
    }


        





}
