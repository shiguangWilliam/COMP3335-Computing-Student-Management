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
import org.springframework.web.bind.annotation.RequestBody;
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
public class DisciplinaryController {
    private Logger log = LoggerFactory.getLogger(DisciplinaryController.class);

    @GetMapping(value = "/API/disciplinary-records", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getDiscinaryRecord(HttpServletRequest request , HttpServletResponse response){
        return (null);
    }




}
