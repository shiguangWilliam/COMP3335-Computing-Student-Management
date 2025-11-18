package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import tables.Disciplinary;
import tables.Grades;
import users.Guardian;
import users.Student;
import users.User;
import utils.AuditUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@RestController
public class ReportController {

    private Logger log = LoggerFactory.getLogger(ReportController.class);
    @RequestMapping(value = "/API/reports", method = {RequestMethod.GET, RequestMethod.POST}, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> queryInfo(HttpServletRequest request, HttpServletResponse response){
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        Session session = (Session) request.getAttribute("session");
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> resp = new HashMap<>();
        if (session == null) {
            err.put("error", "unauthorized");
            err.put("code", 401);
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "unauthorized"));
            return err;
        }
        //角色绑定,信息获取
        String role = session.getRole();
        User user;
        ArrayList<String> studentIds = new ArrayList<>();
        if("student".equalsIgnoreCase(role)){
            user = new Student(session.getUserId());
            studentIds.add(session.getUserId());
        }
        else if("guardian".equalsIgnoreCase(role)){
            //监护人和学生关系
            user = new Guardian(session.getUserId());
            String sql = "SELECT id FROM students_encrypted WHERE guardian_id=?";
            String[] param = {session.getUserId()};
            try(ResultSet rs = DBConnect.dbConnector.executeQuery(sql,param)){
                if(!rs.next()){
                    err.put("error", "NotFound");
                    err.put("code", 404);
                    err.put("message", "No student found");
                    log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "NoStudentForGuardian", "guardianId", session.getUserId()));
                    response.setStatus(404);
                    return err;
                }
                do{
                    studentIds.add(rs.getString("id"));
                } while(rs.next());

            }catch(SQLException e){
                err.put("error", "QueryError");
                err.put("code", 500);
                err.put("message", "Failed to query guardian's students");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "QueryError","id",session.getUserId()));
                response.setStatus(500);
                return err;
            }

        }
        else{
            err.put("error", "Invalid role");
            err.put("code",401);
            response.setStatus(401);
            log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "InvalidRole"));
            return err;
        }
        //获取到了学生ID，查询成绩和纪律
        List<Map<String, Object>> results = new ArrayList<>();
        for(String id: studentIds){
            Map<String, Object> result = new HashMap<>();
            try {
                ArrayList<HashMap<String,String>> grade, disciplinary;
                grade = Grades.getStudentGrades(id);
                for (HashMap<String,String> m : grade) { m.remove("student_id"); }
                disciplinary = Disciplinary.getStudentDisciplinary(id);
                for (HashMap<String,String> m : disciplinary) { m.remove("student_id"); }
                result.put("grade",grade);
                result.put("disciplinary",disciplinary);
                results.add(result);

            } catch (SQLException e) {
                err.put("error", "QueryError");
                err.put("code",500);
                response.setStatus(500);
                err.put("message","Query failed");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "ReportQueryError", "studentId", id));
                return err;
            }
        }
        resp.put("ok",true);
        resp.put("data",results);
        return resp;

    }



}
