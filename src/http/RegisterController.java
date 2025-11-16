package http;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import service.DBConnect;
import utils.ParamValid;
import utils.SecurityUtils;
import utils.AuditUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
public class RegisterController {
    private static final Logger log = LoggerFactory.getLogger(RegisterController.class.getName());

    @PostMapping(value = "/API/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> register(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok",false);
        resp.put("message","No implement");
        response.setStatus(501);
        return resp;
        //不开放注册接口
  
    }
}