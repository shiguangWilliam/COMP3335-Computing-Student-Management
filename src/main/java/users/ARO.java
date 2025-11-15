package users;

import service.DBConnect;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class ARO extends User{
    static String[] normalAttributes = new String[]{"id","last_name","first_name", "department", "role"};
    static String[] encryptedAttributes = new String[]{"gender","email","phone","address","identification_number"};
    public ARO(String ID) {
        super(ID);
        this.type = "ARO";
    }
    public void addGrade(String ID, String studentID, String courseID, String term, String grade, String comments) throws SQLException {
        try {
            String sql = "INSERT INTO grades (id, student_id, course_id, term) VALUES (?, ?, ?, ?)";
            String[] params = {ID, studentID, courseID, term};
            DBConnect.dbConnector.executeUpdate(sql, params);
            String sqlEnc = "INSERT INTO grade_encrypted (id, grade, comments) VALUES (?, ?, ?)";
            String[] paramsEnc = {ID, grade, comments};
            DBConnect.dbConnector.executeUpdate(sqlEnc, paramsEnc);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
    public void updateGrade(String ID, HashMap<String, String> map) throws SQLException {
        ArrayList<String> attNormal = new ArrayList<>();
        ArrayList<String> attEnc = new ArrayList<>();
        ArrayList<String> valNormal = new ArrayList<>();
        ArrayList<String> valEnc = new ArrayList<>();
        for(String key : map.keySet()){
            if(utils.SecurityUtils.isEncrypted(key)){
                attEnc.add(key);
                valEnc.add(map.get(key));
            } else {
                attNormal.add(key);
                valNormal.add(map.get(key));
            }
        }
        StringBuilder sql = new StringBuilder("UPDATE grades SET ");
        StringBuilder sqlEnc = new StringBuilder("UPDATE grade_encrypted SET ");
        for(int i=0;i<attNormal.size();i++){
            sql.append(i == attNormal.size() - 1 ? "%s = ? WHERE id = ?".formatted(attNormal.get(i)) : "%s = ?, ".formatted(attNormal.get(i)));
        }
        for(int i=0;i<attEnc.size();i++){
            sqlEnc.append(i == attEnc.size() - 1 ? "%s = ? WHERE id = ?".formatted(attEnc.get(i)) : "%s = ?, ".formatted(attEnc.get(i)));
        }
        valNormal.add(ID);
        valEnc.add(ID);
        if(valNormal.size() > 1)
            DBConnect.dbConnector.executeUpdate(sql.toString(), valNormal.toArray(new String[0]));
        if(valEnc.size() > 1)
            DBConnect.dbConnector.executeUpdate(sqlEnc.toString(), valEnc.toArray(new String[0]));
    }
    public void deleteGrade(String ID) throws SQLException {
        try {
            String sql = "DELETE FROM grades WHERE id = ?";
            String[] params = {ID};
            DBConnect.dbConnector.executeUpdate(sql, params);
            String sqlEnc = "DELETE FROM grade_encrypted WHERE id = ?";
            DBConnect.dbConnector.executeUpdate(sqlEnc, params);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
}
