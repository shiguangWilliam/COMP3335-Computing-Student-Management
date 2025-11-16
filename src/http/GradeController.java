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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import tables.Grades;
import users.ARO;
import users.User;
import utils.AuditUtils;

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
    public Map<String, Object> getGradeList(@RequestParam String studentid, @RequestParam String courseID,HttpServletRequest request, HttpServletResponse response){
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
        User user;
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

        String sql = "SELECT id, first_name, last_name FROM students";
        String[] param = {};
        if(studentid != null && !studentid.isBlank()){
            sql += " WHERE id = ?";
            param = new String[]{studentid};
        }
        if(courseID != null && !courseID.isBlank()){
            if(sql.contains("WHERE")){
                sql += " AND id IN (SELECT student_id FROM grades WHERE course_id = ?)";
            }
            else{
                sql += " WHERE id IN (SELECT student_id FROM grades WHERE course_id = ?)";
            }
            String[] newParam = new String[param.length + 1];
            System.arraycopy(param, 0, newParam, 0, param.length);
            newParam[param.length] = courseID;
            param = newParam;
        }
        ArrayList<HashMap<String,Object>> datas = new ArrayList<>();
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(sql,param)){
            if(!rs.next()){
                err.put("ok",false);
                err.put("message","No Student record");
                log.warn("audit={}", AuditUtils.pack("requestId", requestId, "message", "No student record found"));
                return err;
            }
            ArrayList<HashMap<String,String>> data;
            do{
                String sid = rs.getString("id");
                String name = rs.getString("last_name") +" "+ rs.getString("first_name");
                data = Grades.getStudentGrades(sid);
                HashMap<String,Object> student = new HashMap<>();
                student.put("id",sid);
                student.put("name",name);
                student.put("grade",data);
                datas.add(student);
            }while(rs.next());
        }
        catch (SQLException e){
            err.put("code",500);
            err.put("message","Query Failed");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Query Failed"));
            return err;
        }
        resp.put("ok",true);
        resp.put("data",datas);
        return resp;

    }

    @PostMapping(value = "/API/grades", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String,Object> postGrade(HttpServletRequest request, HttpServletResponse response){
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
        User user;
        if("ARO".equalsIgnoreCase(role)){
            user = new ARO(session.getUserId());
        }
        else{
            err.put("code",403);
            err.put("message","Forbidden");
            log.error("audit={}", AuditUtils.pack("requestId", requestId, "message", "Role Forbidden"));
            return err;
        }
        return resp;
    }




}
