package http;

import app.Session;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class ProfileController {

    @GetMapping(value = "/API/profile", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> profile(HttpServletRequest request) {
        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            // 正常情况下，SessionFilter已返回401；这里兜底
            Map<String, Object> err = new HashMap<>();
            err.put("error", "unauthorized");
            err.put("code", 401);
            return err;
        }
        //调用Session表中存储的用户信息，构建响应体
        Map<String, Object> resp = new HashMap<>();
        resp.put("email", session.getEmail());
        resp.put("userId", session.getUserId());
        resp.put("role", session.getRole());
        resp.put("name", session.getName());
        return resp;
    }
}