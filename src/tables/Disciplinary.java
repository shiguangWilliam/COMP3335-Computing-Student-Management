package tables;

import service.DBConnect;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class Disciplinary {
    public static ArrayList<HashMap<String, String>> getStudentDisciplinary(String studentID, String date, String staff_id) throws SQLException {
        ArrayList<HashMap<String, String>> disciplinaryMap = new ArrayList<>();
        try {
                StringBuilder sql = new StringBuilder("SELECT dr.id, dr.student_id, dr.date, dr.staff_id, dre.descriptions, " +
                    "COALESCE(CONCAT_WS(' ', s.first_name, s.last_name), '') AS student_name, " +
                    "COALESCE(CONCAT_WS(' ', st.first_name, st.last_name), '') AS staff_name " +
                    "FROM disciplinary_records dr JOIN disciplinary_records_encrypted dre ON dr.id = dre.id " +
                    "LEFT JOIN students s ON dr.student_id = s.id " +
                    "LEFT JOIN staffs st ON dr.staff_id = st.id WHERE 1=1");
            ArrayList<String> params = new ArrayList<>();
            if (studentID != null && !studentID.isBlank()) {
                sql.append(" AND dr.student_id = ?");
                params.add(studentID);
            }
            if (date != null && !date.isBlank()) {
                sql.append(" AND dr.date = ?");
                params.add(date);
            }
            if (staff_id != null && !staff_id.isBlank()) {
                sql.append(" AND dr.staff_id = ?");
                params.add(staff_id);
            }
            sql.append(" ORDER BY dr.date DESC");
            ResultSet rs = DBConnect.dbConnector.executeQuery(sql.toString(), params.toArray(new String[0]));
            while (rs.next()) {
                HashMap<String, String> map = new HashMap<>();
                map.put("id", rs.getString("id"));
                map.put("student_id", rs.getString("student_id"));
                map.put("date", rs.getString("date"));
                map.put("staff_id", rs.getString("staff_id"));
                map.put("descriptions", rs.getString("descriptions"));
                String studentName = rs.getString("student_name");
                if (studentName != null && !studentName.isBlank()) {
                    map.put("student_name", studentName);
                }
                String staffName = rs.getString("staff_name");
                if (staffName != null && !staffName.isBlank()) {
                    map.put("staff_name", staffName);
                }
                disciplinaryMap.add(map);
            }
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
        return disciplinaryMap;
    }
    public static ArrayList<HashMap<String, String>> getStudentDisciplinary(String studentID) throws SQLException {
        return getStudentDisciplinary(studentID, null, null);
    }
}
