package http;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class RegisterController {

    @PostMapping(value = "/API/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> register(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        response.setStatus(501);
        Map<String, Object> resp = new HashMap<>();
        resp.put("code", "NOT_IMPLEMENTED");
        resp.put("message", "register not available");
        return resp;
    }
}