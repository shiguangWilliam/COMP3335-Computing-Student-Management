package tables;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import service.DBConnect;
public class Grades {
    public static ArrayList<HashMap<String, String>> getStudentGrades(String studentID) throws SQLException {
        ArrayList<HashMap<String, String>> gradesMap = new ArrayList<>();
        try {
            String sql = "SELECT * FROM Grades WHERE student_id = ?";
            String[] params = {studentID};
            ResultSet rs = DBConnect.dbConnector.executeQuery(sql, params);
            while (rs.next()) {
                HashMap<String, String> map = new HashMap<>();
                String ID = rs.getString("id");
                String encrypted_id = rs.getString("encrypted_id");
                String courseID = rs.getString("course_id");
                String courseName = Courses.getName(courseID);
                String term = rs.getString("term");
                ResultSet trs = DBConnect.dbConnector.executeQuery("SELECT grade,comments FROM grades_encrypted WHERE id = ?", new String[]{encrypted_id});
                // System.err.println(trs.next());
                String grade = trs.getString("grade");
                String comments = trs.getString("comments");
                map.put("id", ID);
                map.put("student_id", studentID);
                map.put("course_id", courseID);
                map.put("course_name", courseName);
                map.put("term", term);
                map.put("grade", grade);
                map.put("comments", comments);
                gradesMap.add(map);
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
        return gradesMap;
    }


}
