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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import tables.Grades;
import users.ARO;
import users.User;
import utils.AuditUtils;
import tables.Courses;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
public class GradeController {
    private Logger log = LoggerFactory.getLogger(GradeController.class);

    @GetMapping(value = "/API/grades", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getGradeList(@RequestParam(value = "studentId", required = false) String studentid,
                                            @RequestParam(value = "courseId", required = false) String courseID,
                                            HttpServletRequest request, HttpServletResponse response){
        //基础信息（RequestID，session获取校验）
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
        ARO user;
        if("ARO".equalsIgnoreCase(role)){
            user = new ARO(session.getUserId());
        }
        else{
            err.put("code",403);
            err.put("message","Forbidden");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Role Forbidden"));
            return err;
        }
        //确认用户身份
        ArrayList<String> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT g.id, g.encrypted_id, g.student_id, g.course_id, g.term, ge.grade, ge.comments " +
                "FROM grades g JOIN grades_encrypted ge ON g.encrypted_id = ge.id WHERE 1=1");
        if(studentid != null && !studentid.isBlank()){
            sql.append(" AND g.student_id = ?");
            params.add(studentid);
        }
        if(courseID != null && !courseID.isBlank()){
            sql.append(" AND g.course_id = ?");
            params.add(courseID);
        }
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(sql.toString(), params.toArray(new String[0]))){
            ArrayList<Map<String, Object>> gradeList = new ArrayList<>();
            while(rs.next()){
                Map<String, Object> grade = new HashMap<>();
                grade.put("id", rs.getString("id"));
                grade.put("student_id", rs.getString("student_id"));
                grade.put("course_id", rs.getString("course_id"));
                grade.put("grade", rs.getString("grade"));
                grade.put("comments", rs.getString("comments"));
                grade.put("term", rs.getString("term"));
                gradeList.add(grade);
            }
            resp.put("data", gradeList);
            resp.put("ok", true);
            log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "Grades Retrieved Successfully"));
            return resp;
        } catch (SQLException e) {
            err.put("code",500);
            err.put("message","Internal Server Error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
            return err;
        }

    }

    @PostMapping(value = "/API/grades", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String,Object> postGrade(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response){
        //基础信息（RequestID，session获取校验）
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
        ARO user;
        if("ARO".equalsIgnoreCase(role)){
            user = new ARO(session.getUserId());
        }
        else{
            err.put("code",403);
            err.put("message","Forbidden");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Role Forbidden"));
            return err;
        }
        //安全读取（避免把null读成"null"字符串）
        String studentID = body.get("studentId")==null?null:body.get("studentId").toString();
        String courseID = body.get("courseId")==null?null:body.get("courseId").toString();
        String grade = body.get("grade")==null?null:body.get("grade").toString();

        if(studentID==null || studentID.isBlank() || courseID==null || courseID.isBlank() || grade==null){
            err.put("code",400);
            err.put("message","Bad Request: Missing Parameters");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Missing Parameters"));
            return err;
        }
        try{
            if(Courses.getName(courseID)==null){
                err.put("code",400);
                err.put("message","Bad Request: Invalid Course ID");
                log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Invalid Course ID"));
                return err;
            }
        }
        catch (Exception e){
            err.put("code",500);
            err.put("message","Internal Server Error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Exception: " + e.getMessage()));
            return err;
        }
        
        String studentSql = "SELECT COUNT(*) AS count FROM students WHERE id = ?";
        String[] studentParam = {studentID};
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(studentSql, studentParam)){
            if(rs.next() && rs.getInt("count")==0){
                err.put("code",400);
                err.put("message","Bad Request: Invalid Student ID");
                log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Invalid Student ID"));
                return err;
            }
        }
        catch (Exception e){
            err.put("code",500);
            err.put("message","Internal Server Error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Exception: " + e.getMessage()));
            return err;

        }
        
        String querySql = "SELECT id, encrypted_id FROM grades WHERE student_id = ? AND course_id = ?";
        String[] queryParam = {studentID, courseID};
        String comment = body.get("comments")==null? "": body.get("comments").toString();
        String term = body.get("term")==null? "2024Sem1": body.get("term").toString();//默认学期2024Sem1

        try(ResultSet rs = DBConnect.dbConnector.executeQuery(querySql, queryParam)){
            if(!rs.next()){//没有对应成绩记录，创建
                String gid = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
                String enc_gid = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
                String insertSql = "INSERT INTO grades (id,encrypted_id, student_id, course_id, term) VALUES (?, ?, ?, ?, ?)";
                String insertEncSql = "INSERT INTO grades_encrypted (id, grade, comments) VALUES (?, ?, ?)";
                String[] insertParam = {gid, enc_gid, studentID, courseID, term};
                String[] insertEncParam = {enc_gid, grade, comment};
                try{//创建
                    DBConnect.dbConnector.executeUpdate(insertSql, insertParam);
                    DBConnect.dbConnector.executeUpdate(insertEncSql, insertEncParam);
                    response.setStatus(201);
                    resp.put("ok", true);
                    resp.put("message", "Grade Record Created Successfully");
                    resp.put("id",gid);
                    log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "Grade Record Created Successfully"));
                }
                catch (SQLException e){
                    err.put("code",500);
                    err.put("message","Internal Server Error");
                    log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
                    return err;
                }
            }
            else{//有记录，更新
                String gid = rs.getString("encrypted_id");
                String updateSql = "UPDATE grades_encrypted SET grade = ?, comments = ? WHERE id = ?";
                String[] updateParam = {grade, comment, gid};
                try{
                    DBConnect.dbConnector.executeUpdate(updateSql, updateParam);
                    resp.put("ok", true);
                    resp.put("message", "Grade Record Updated Successfully");
                    resp.put("id",gid);
                    log.info("audit={}", AuditUtils.pack("requestId", requestId, "message", "Grade Record Updated Successfully"));
                }
                catch (SQLException e){
                    err.put("code",500);
                    err.put("message","Internal Server Error");
                    log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
                    return err;
                }

            }
        }
        catch (SQLException e) {
            err.put("code",500);
            err.put("message","Internal Server Error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
            return err;
        }

        
        return resp;
    }

    @DeleteMapping(value = "/API/grades")
    public Map<String, Object> deleteGrade(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response){
        //基础信息（RequestID，session获取校验）
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
        ARO user;
        if("ARO".equalsIgnoreCase(role)){
            user = new ARO(session.getUserId());
        }
        else{
            err.put("code",403);
            err.put("message","Forbidden");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Role Forbidden"));
            return err;
        }
        //安全读取（避免把null读成"null"字符串）
        String gradeID = body.get("gradeId")==null?null:body.get("gradeId").toString();

        if(gradeID==null || gradeID.isBlank()){
            err.put("code",400);
            err.put("message","Bad Request: Missing Parameters");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Missing Parameters"));
            return err;
        }

        String querySql = "SELECT encrypted_id FROM grades WHERE id = ?";
        String[] queryParam = {gradeID};
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(querySql, queryParam)){
            if(rs.next()){
                String encId = rs.getString("encrypted_id");
                String deleteGradeSql = "DELETE FROM grades WHERE id = ?";
                String deleteEncSql = "DELETE FROM grades_encrypted WHERE id = ?";
                try{
                    DBConnect.dbConnector.executeUpdate(deleteGradeSql, new String[]{gradeID});
                    if(encId != null && !encId.isBlank()){
                        DBConnect.dbConnector.executeUpdate(deleteEncSql, new String[]{encId});
                    }
                    resp.put("ok", true);
                    resp.put("message", "Grade Record Deleted Successfully");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId,"User",session.getUserId(), "message", "Grade Record Deleted Successfully"));//敏感操作
                    return resp;
                } catch (SQLException e){
                    err.put("code",500);
                    err.put("message","Internal Server Error");
                    log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
                    return err;
                }
            } else {
                err.put("code",404);
                err.put("message","Grade Record Not Found");
                log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Grade Record Not Found"));
                return err;
            }
        }
        catch (SQLException e) {
            err.put("code",500);
            err.put("message","Internal Server Error");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "SQL Exception: " + e.getMessage()));
            return err;
        }

        
    }
}
