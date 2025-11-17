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
                return rs.getString("name");
            } else {
                return null;
            }
        } catch (Exception e){
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }

    public static String getIdByName(String courseName) throws SQLException {
        try{
            String sql = "SELECT id FROM Courses WHERE name = ? LIMIT 1";
            String[] params = {courseName};
            ResultSet rs = service.DBConnect.dbConnector.executeQuery(sql, params);
            if(rs.next()){
                return rs.getString("id");
            } else {
                return null;
            }
        } catch (Exception e){
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
}
