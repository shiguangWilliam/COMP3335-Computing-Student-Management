package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping(value = "/API/grade", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getGradeList(HttpServletRequest request, HttpServletResponse response){
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
            return err;
        }
        //确认用户身份

        String sql = "SELECT id, first_name, last_name FROM students";
        String[] param = {};
        ArrayList<HashMap<String, String>> data = new ArrayList<>();
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(sql,param)){
            if(!rs.next()){
                err.put("ok",false);
                err.put("message","No Student record");
                return err;
            }
            ArrayList<HashMap<String,String>> 
            do{
                String sid = rs.getString("id");
                Grades.getStudentGrades(sid);
            }while(rs.next());
        }
        catch (SQLException e){

        }

    }
}
