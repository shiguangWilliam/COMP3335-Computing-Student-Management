package http;

import app.SessionStore;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class LogoutController {

    @Autowired
    private SessionStore sessionStore;

    @PostMapping(value = "/API/logout", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
        String sid = readSidCookie(request);
        if (sid != null) {
            sessionStore.invalidate(sid);
        }
        // 清除浏览器 Cookie
        response.addHeader("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("message", "logged out");
        return resp;
    }

    private String readSidCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if ("sid".equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}