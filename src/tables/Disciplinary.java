package tables;

import service.DBConnect;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class Disciplinary {
    public static ArrayList<HashMap<String, String>> getStudentDisciplinary(String studentID) throws SQLException {
        ArrayList<HashMap<String, String>> disciplinaryMap = new ArrayList<>();
        try {
            String sql = "SELECT * FROM Disciplinary_records WHERE student_id = ?";
            String[] params = {studentID};
            ResultSet rs = DBConnect.dbConnector.executeQuery(sql, params);
            while (rs.next()) {
                HashMap<String, String> map = new HashMap<>();
                String ID = rs.getString("id");
                String date = rs.getString("date");
                String staffID = rs.getString("staff_id");
                ResultSet trs = DBConnect.dbConnector.executeQuery("SELECT descriptions FROM grade_encrypted WHERE id = ?", new String[]{ID});
                trs.next();
                String descriptions = trs.getString("descriptions");
                map.put("id", ID);
                map.put("student_id", studentID);
                map.put("date", date);
                map.put("staff_id", staffID);
                map.put("descriptions", descriptions);
                disciplinaryMap.add(map);
            }
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
        return disciplinaryMap;
    }
}
