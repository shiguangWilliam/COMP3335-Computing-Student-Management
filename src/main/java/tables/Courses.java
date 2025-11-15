package tables;

import java.sql.ResultSet;
import java.sql.SQLException;

public class Courses {
    public static String getName(String courseID) throws SQLException{
        try{
            String sql = "SELECT name FROM Courses WHERE id = ?";
            String[] params = {courseID};
            ResultSet rs = service.DBConnect.dbConnector.executeQuery(sql, params);
            if(rs.next()){
                return rs.getString("course_name");
            } else {
                return null;
            }
        } catch (Exception e){
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
}
