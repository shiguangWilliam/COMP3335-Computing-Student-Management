package http;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthController {

    // 占位登录接口：接受任意 JSON（包括加密信封），返回示例结果
    @PostMapping(value = "/API/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> login(@RequestBody Map<String, Object> body) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("message", "login accepted (placeholder)");
        resp.put("received", body);
        return resp;
    }


}